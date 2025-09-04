function parseMarkdown(text) {
  const result = [];
  const lines = text.split('\n');
  let currentText = [];
  let inTable = false;
  let currentTable = [];

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();

    // Check if the row indicates table (starts and ends with |)
    const isTableRow = line.startsWith('|') && line.endsWith('|');

    if (isTableRow) {
      // Save previous text and begin table
      if (!inTable && currentText.length > 0) {
        const textContent = currentText.join('\n').trim();
        if (textContent)
          result.push({ type: 'text', content: textContent });
        currentText = [];
      }

      inTable = true;
      currentTable.push(line);
    } else {
      // Save table if the table ends
      if (inTable && currentTable.length > 0) {
        result.push({ type: 'table', content: parseTable(currentTable) });
        currentTable = [];
        inTable = false;
      }

      if (line || currentText.length > 0)
        currentText.push(lines[i]); // push without trimming to keep format
    }
  }

  if (inTable && currentTable.length > 0) {
    result.push({ type: 'table', content: parseTable(currentTable) });
  } else if (currentText.length > 0) {
    const textContent = currentText.join('\n').trim();

    if (textContent)
      result.push({ type: 'text', content: textContent });
  }

  return result;
}

function parseTable(tableLines) {
  const table = {
    headers: [],
    rows: []
  };

  let headerProcessed = false;

  for (const line of tableLines) {
    const cells = line.split('|')
    .slice(1, -1) // Delete first and last empty elements
    .map(cell => cell.trim());

    // Skip seperator line (contains only --)
    if (cells.some(cell => cell.includes('--'))) {
      headerProcessed = true;
      continue;
    }

    if (!headerProcessed)
      table.headers = cells;
    else
      table.rows.push(cells);
  }

  return table;
}

function toAdaptiveCard(parsedContent) {
  const body = [];

  parsedContent.forEach(item => {
    if (item.type === 'text') {
      body.push({
        type: "TextBlock",
        text: item.content.replaceAll('\n', '\n\n'),
        wrap: true
      });
    } else if (item.type === 'table') {
      const table = item.content;

      // Headers
      if (table.headers.length > 0) {
        body.push({
          type: "ColumnSet",
          columns: table.headers.map(header => ({
            type: "Column",
            width: "stretch",
            items: [{
              type: "TextBlock",
              text: header,
              weight: "Bolder",
              wrap: true
            }]
          }))
        });
      }

      // Rows
      table.rows.forEach(row => {
        body.push({
          type: "ColumnSet",
          columns: row.map(cell => ({
            type: "Column",
            width: "stretch",
            items: [{
              type: "TextBlock",
              text: cell,
              wrap: true
            }]
          }))
        });
      });
    }
  });

  return body;
}


export {
  parseMarkdown,
  toAdaptiveCard,
};
