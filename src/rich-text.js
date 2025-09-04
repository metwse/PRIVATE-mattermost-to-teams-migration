const SUPPORTED_LANGUAGES = {
  'javascript': ['js'],
  'cpp': ['cc', 'c++', 'cxx', 'hpp', 'hxx', 'ipp', 'ixx'],
  'c': ['h'],
  'bash': ['sh'],
  'html': ['htm', 'xml', 'xhtml'],
  'css': ['scss', 'sass'],
  'sql': ['psql', 'pl/pgsql']
};

function parseMarkdown(text) {
  const result = [];
  const lines = text.split('\n');
  let collect = [];
  let state = 'text';

  const end = () => {
    if (collect.length) {
      switch (state) {
        case 'table': {
          result.push({ type: 'table', content: parseTable(collect) });
          break;
        }
        case 'text': {
          const textContent = collect.join('\n').trim();

          if (textContent)
            result.push({ type: 'text', content: textContent });
          break;
        }
        case 'codeblock': {
          const textContent = collect.slice(1).join('\n').trim();

          const block = {
            type: 'codeblock',
            content: textContent
          };

          const target = collect[0];

          for (const [lang, alias] of Object.entries(SUPPORTED_LANGUAGES)) {
            if (lang == target || alias.includes(target)) {
              block.language = lang;
              break;
            }
          }

          if (!block.language)
            block.language = 'PlainText';

          result.push(block);
        }
      }
    }
    collect = [];
    state = 'text';
  };

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();

    // Check if the row indicates table (starts and ends with |)
    if (state == 'codeblock' || line.startsWith('```')) {
      if (state != 'codeblock') {
        end();
        collect.push(line.substring(3));
        state = 'codeblock';
      } else if (line.startsWith('```')) {
        end();
      } else {
        state = 'codeblock';
        collect.push(lines[i]);
      }
    } else if (line.startsWith('|') && line.endsWith('|')) {
      if (state != 'table')
        end();

      state = 'table';
      collect.push(line);
    } else {
      if (state != 'text')
        end();

      state = 'text';
      if (line || collect.length > 0)
        collect.push(lines[i]);
    }
  }

  end();

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

  for (const item of parsedContent) {
    switch (item.type) {
      case 'text':
        body.push({
          type: 'TextBlock',
          text: item.content.replaceAll('\n', '\n\n'),
          wrap: true
        });
        break;
      case 'table': {
        const table = item.content;

        // Headers
        if (table.headers.length > 0) {
          body.push({
            type: 'ColumnSet',
            columns: table.headers.map(header => ({
              type: 'Column',
              width: 'stretch',
              items: [{
                type: 'TextBlock',
                text: header,
                weight: 'Bolder',
                wrap: true
              }]
            }))
          });
        }

        // Rows
        table.rows.forEach(row => {
          body.push({
            type: 'ColumnSet',
            columns: row.map(cell => ({
              type: 'Column',
              width: 'stretch',
              items: [{
                type: 'TextBlock',
                text: cell,
                wrap: true
              }]
            }))
          });
        });
        break;
      }
      case 'codeblock':
        body.push({
          type: 'CodeBlock',
          codeSnippet: item.content,
          language: item.language
        });
        break;
    }
  }

  return body;
}


export {
  parseMarkdown,
  toAdaptiveCard,
};
