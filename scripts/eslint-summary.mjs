let d = ''
process.stdin.on('data', (c) => (d += c)).on('end', () => {
  for (const f of JSON.parse(d))
    for (const m of f.messages)
      console.log(f.filePath.split('site')[1], m.line, m.ruleId, '|', m.message.split('\n')[0].slice(0, 120))
})
