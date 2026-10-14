# Histórico de versões

## 1.5.1 — 2026-10-14

- Detecta colisão entre o JavaScript antigo e o novo na memória do navegador após renomeação do repositório.
- Disponibiliza temporariamente o tipo `custom:vaccum-card-animations-v151` e seu editor atualizado quando o registro principal já pertence a uma versão antiga.
- Evita alertas falsos ao recarregar o mesmo código e orienta a remoção do recurso antigo do HACS.
- Adiciona testes de regressão do registro duplicado, preservando o tipo e as configurações anteriores.

## 1.5.0 — 2026-10-14

- Substitui a vista de cima pela animação frontal aprovada, com deslocamento horizontal e em profundidade.
- Desenha corpo, sensores, base e mops em uma perspectiva compartilhada. Os mops ficam finos e apoiados no piso.
- Suaviza aceleração e frenagem; o robô gira no próprio eixo antes de mudar de direção e entra de ré na base.
- Adiciona escolha independente de imagens para o chão e a parede em **Mais controles → Aparência → Cenário**, com prévia, salvamento local e restauração.
- Distribui sujeiras aleatoriamente ao longo da trajetória, com surgimento gradual e coleta ao passar.
- Preserva posição, imagens e coleta durante atualizações de sensores, alterações de tema e edição de botões.
- Mantém temas, cores, nomes e ícones personalizados, atalhos e som de seleção.
- Atualiza a demonstração, os testes e as instruções para o repositório `Douglaslopes24/vacuum-card-home-assistant`.

O arquivo de instalação continua sendo `Card-aspirador-.js`, indicado em `hacs.json`. O tipo do card continua `custom:vaccum-card-animations`. Percursos configurados abaixo de 24 segundos passam a usar o mínimo de 24 segundos; o padrão é 28 segundos.
