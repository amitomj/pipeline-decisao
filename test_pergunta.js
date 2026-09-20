const apiKey = "orq_F9yLXhTgNHgWcLqonMs6gl4NiupJno75fyXZtz1pyoToshxo";

async function testEndpoint(path) {
  const url = `https://atlas.altec-csm.dev/v1/${path}`;
  console.log(`\n--- Testando endpoint: ${url} ---`);
  try {
    const res = await fetch(url, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${apiKey}`,
        "Content-Type": "application/json",
        "User-Agent": "Orquestrador/1.0"
      },
      body: JSON.stringify({
        query: "Qualificação de contrato de trabalho"
      })
    });
    
    console.log(`STATUS: ${res.status} ${res.statusText}`);
    const text = await res.text();
    console.log(`RESPONSE (primeiros 1000 chars):`);
    console.log(text.substring(0, 1000));
  } catch (err) {
    console.error(`ERRO ao chamar ${path}:`, err);
  }
}

async function run() {
  await testEndpoint("pesquisa");
  await testEndpoint("pergunta");
}

run();
