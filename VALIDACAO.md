# Validação — versão 1.5.0

Validação realizada em 14 de outubro de 2026, sobre o mesmo arquivo distribuído pelo HACS.

- `npm run build`, `npm test` e `npm run check` passaram. O arquivo `dist/Card-aspirador-.js` é idêntico a `vaccum-card-animations.js`, e `dist` contém somente o JavaScript de produção, sem dependências externas.
- A descoberta do arquivo e a geração do recurso foram verificadas executando os métodos correspondentes do código atual do HACS com o manifesto e os dados deste repositório. Resultado: `dist/Card-aspirador-.js` e `/hacsfiles/vacuum-card-home-assistant/Card-aspirador-.js`. A categoria é **Dashboard/Plugin**.
- 223 verificações funcionais passaram em um DOM simulado: sensores, unidades, estados, capacidades do aspirador, destinos e dados das ações, controles personalizados, editor, ícones, temas, contraste, preferências locais, áudio e compatibilidade com configurações anteriores.
- 39 verificações de movimento passaram: câmera frontal, partida da base, curvas sem deslocamento lateral, orientação coerente com a direção, aceleração, profundidade, pausa e retomada, retorno, redimensionamento, mops finos no plano do chão, movimento reduzido e limpeza dos quadros ao remover o card. A volta a uma aba não retoma um robô pausado. O percurso permanece dentro de cenas de 296, 344, 444 e 720 px.
- A coleta foi verificada em um percurso completo e a colocação aleatória foi conferida em 80 distribuições. Todos os 12 grupos permanecem ao alcance da trajetória. Atualizações de sensores, troca de tema e edição de botões preservam o progresso. Uma nova sessão cria outra distribuição.
- `npm run test:browser` passou em Chromium: cliques reais em iniciar, pausar, continuar, controles e retorno; seleção de tema; posição final na base; preferência de movimento reduzido; ausência de erros JavaScript; largura de tela de 320 px sem rolagem horizontal.
- O teste de cenário no navegador selecionou arquivos de chão e parede separadamente, confirmou redução de 1280 × 720 para 1024 × 576, persistência ao recarregar, manutenção das imagens ao trocar o tema e editar botões, restauração individual e total, rejeição de imagem inválida sem perda da anterior e aviso quando o armazenamento está bloqueado ou cheio.
- Capturas da versão de produção foram inspecionadas com cenário personalizado, tema escuro, tela de 320 px e robô em movimento. Os indicadores continuam legíveis e separados do robô.
- O som foi verificado com uma simulação de Web Audio: botões, atalhos, navegação, potência, volume, mudo, bloqueio de áudio e encerramento do contexto. A reprodução audível em um aparelho físico não faz parte dessa validação.

Os testes de navegador usam entidades simuladas no `demo.html`. A versão não foi instalada na instância particular do Home Assistant nem conectada a um aspirador físico durante esta validação. Os comandos reais dependem das capacidades expostas pela integração do aparelho.

## Reproduzir

```sh
npm run build
npm test
npm run check
```

Testes opcionais em navegador:

```sh
npm install --no-save playwright
npx playwright install chromium
npm run test:browser
```

Para usar um Chromium já instalado, defina `CHROMIUM_EXECUTABLE_PATH`. Argumentos adicionais podem ser fornecidos como uma lista JSON em `CHROMIUM_ARGS`. As capturas são gravadas em uma pasta temporária ou em `BROWSER_TEST_OUTPUT`, se definido.
