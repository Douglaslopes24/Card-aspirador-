# Validação — versão 1.2.0

- Sintaxe JavaScript e exemplo YAML verificados.
- 105 verificações funcionais passaram executando o código do card e da demonstração em um DOM simulado: posicionamento inicial antes da conexão, percurso e rotação originais, preservação da posição e do ângulo ao abrir e fechar os controles, ausência de comandos ao abrir a interface, tecla Esc, potência, limpeza pontual, localização, scripts personalizados, destino e dados das ações, alternativas para imagens de ícones, nomes tratados como texto, adição/edição/remoção de atalhos no editor, proteção contra perda de edições seguidas e funcionamento dos controles simulados.
- O áudio foi verificado com uma simulação da API Web Audio: som nos controles principais, navegação, atalhos e potência; duração de 140 ms; volume inicial; desligamento e volume zero; limites de volume; silêncio nas atualizações dos sensores e botões desabilitados; retomada após a primeira interação; continuidade dos comandos se o áudio for bloqueado ou indisponível; liberação dos nós e encerramento do contexto ao remover o card. Esses testes não verificam a reprodução audível em um aparelho físico.
- A geometria do percurso foi conferida para cenas de 296, 344, 414 e 720 px de largura.
- Não há navegador de teste disponível neste ambiente. As verificações acima não substituem a inspeção visual e sonora em um navegador.
- O card não foi testado com um Home Assistant em execução nem com seu aparelho físico. A conexão real exige a entidade `vacuum.*` e os sensores disponíveis na integração do aspirador.
