# Vaccum card-animations

Card personalizado e animado para Home Assistant. Na base, o aspirador fica à direita; bateria, tempo de limpeza e tempo dos mops aparecem à esquerda. O robô mantém a aparência e a animação originais, visto de cima, com dois mops e a escova lateral girando. Ao iniciar a limpeza, ele sai da base, percorre o card de um lado para o outro e muda de direção nas curvas. A bateria aparece no topo durante a limpeza.

O botão **Mais controles**, na parte de baixo, abre uma interface com ícones próprios para iniciar/pausar, voltar à base, parar, fazer limpeza pontual e encontrar o robô. A potência usa os modos reais publicados pelo aparelho. Você também pode criar atalhos para cômodos e mops com nomes e ícones personalizados.

Os botões reproduzem um som curto de seleção no celular, tablet ou navegador que exibe o painel. O som também acompanha a escolha da potência e os atalhos personalizados. Você pode desligá-lo e ajustar seu volume no editor visual.

Em **Mais controles → Aparência**, escolha um tema e as cores dos textos principais, dos rótulos e dos valores de bateria e tempos. As escolhas ficam salvas nesse navegador ou dispositivo. O card corrige cores com pouco contraste para manter as informações legíveis.

Pausa mantém o aspirador na posição da animação. Retorno mostra o robô se aproximando da base; o estado **Na base** só aparece quando o Home Assistant informa `docked`. O estado `idle` aparece como **Parado**, próximo à base. Erro e indisponibilidade interrompem o movimento.

## Instalação pelo HACS

1. Abra **HACS → menu ⋮ → Repositórios personalizados**.
2. Em **Repository**, cole `https://github.com/Douglaslopes24/Card-aspirador-`.
3. Em **Type**, escolha **Dashboard**. Em versões antigas, a categoria pode aparecer como **Plugin** ou **Frontend**. O Vaccum card-animations é um cartão de painel; selecionar **Integration** causa a mensagem de estrutura incompatível.
4. Clique em **Add**, procure **Vaccum card-animations** no HACS e baixe o card. Se aparecer uma escolha de versão, selecione **main**.
5. Recarregue o navegador ou aplicativo. No seu painel, selecione **Editar painel → Adicionar cartão → Vaccum card-animations** e escolha a entidade `vacuum.*` do robô. Se preferir, use o cartão **Manual** com o YAML mínimo abaixo.

O HACS usa `hacs.json` para identificar o arquivo `dist/Card-aspirador-.js`. Esse arquivo inclui o card, o editor, as animações, os ícones e os sons. A instalação pelo HACS usa o recurso:

```text
/hacsfiles/Card-aspirador-/Card-aspirador-.js
```

Confira **Configurações → Painéis → Recursos**. Se o HACS não tiver criado a entrada automaticamente, adicione esse caminho como **Módulo JavaScript**. Em painéis gerenciados por YAML, configure o recurso no próprio painel. Se você já instalou manualmente, depois de baixar pelo HACS deixe apenas o novo recurso e remova a entrada antiga `/local/aspirador-vivo-card.js` dessa lista. Recarregue o navegador/aplicativo após alterar os recursos.

## Instalação manual

1. Copie `aspirador-vivo-card.js` para `/config/www/aspirador-vivo-card.js` no Home Assistant. Crie a pasta `www` se necessário.
2. Em **Configurações → Painéis → Recursos**, adicione `/local/aspirador-vivo-card.js?v=1.3.0`, tipo **Módulo JavaScript**. A opção Recursos pode exigir o modo avançado do seu perfil. Se seu painel é gerenciado por YAML, adicione o recurso na configuração desse painel.
3. Recarregue o navegador ou aplicativo. Adicione **Vaccum card-animations** na seleção de cartões. Se preferir, use **Manual** e cole o conteúdo de `exemplo.yaml`.
4. Escolha a entidade `vacuum.*` e, se disponíveis, os sensores da bateria, do tempo de limpeza e dos mops. O card já inclui editor visual.

Configuração mínima:

```yaml
type: custom:aspirador-vivo-card
entity: vacuum.seu_aspirador
name: Vaccum card-animations
```

Com sensores, substituindo os IDs de exemplo pelos seus:

```yaml
type: custom:aspirador-vivo-card
entity: vacuum.seu_aspirador
battery_entity: sensor.seu_aspirador_bateria
cleaning_time_entity: sensor.seu_aspirador_tempo_de_limpeza
mop_time_entity: sensor.seu_aspirador_tempo_dos_mops
mop_label: "Mops · tempo restante"
```

## Dados e comportamento

| Opção | Uso | Padrão |
| --- | --- | --- |
| `entity` | Entidade `vacuum.*` do aspirador | Obrigatória |
| `name` | Nome exibido no topo | Vaccum card-animations |
| `battery_entity` | Sensor da bateria, de 0 a 100 | Atributo `battery_level` ou `battery` |
| `cleaning_time_entity` | Sensor do tempo de limpeza | Atributo `cleaning_time` ou `clean_time` |
| `mop_time_entity` | Sensor do tempo/vida útil dos mops | Atributo `mop_time_left` ou `mop_remaining` |
| `mop_label` | Rótulo para o significado do seu sensor | Mops · tempo restante |
| `battery_attribute` | Nome de outro atributo da bateria | Automático |
| `cleaning_time_attribute` | Nome de outro atributo do tempo | Automático |
| `mop_time_attribute` | Nome de outro atributo dos mops | Automático |
| `cleaning_time_unit` | Unidade do atributo, como `min` ou `s` | min |
| `mop_time_unit` | Unidade do atributo, como `min`, `h` ou `%` | min |
| `show_controls` | Exibir Iniciar/Pausar e Voltar à base | true |
| `animation` | Habilitar deslocamento do aspirador | true |
| `sound` | Som curto de seleção nos botões e na potência | true |
| `sound_volume` | Volume do som, de 0 (mudo) a 1 | 0.18 |
| `cycle_seconds` | Duração de cada percurso, entre 8 e 90 segundos | 18 |
| `custom_buttons` | Lista de até 12 atalhos personalizados | Lista vazia |
| `icons` | Substituições dos ícones dos controles principais | Ícones próprios do card |
| `theme` | `auto`, `light`, `dark` ou `ha:Nome do tema` | auto |
| `text_color` | Cor dos textos principais, em `#RGB` ou `#RRGGBB` | Cor do tema |
| `secondary_text_color` | Cor dos rótulos e estado, em hexadecimal | Cor do tema |
| `value_color` | Cor da bateria e dos tempos, em hexadecimal | Cor dos textos principais |
| `appearance_id` | Identificação opcional para separar as preferências de cards iguais | Painel, entidade e nome |

Um sensor configurado tem prioridade sobre o atributo. O card usa a unidade informada pelo sensor; se o sensor não tiver unidade, usa a opção de unidade do YAML e, em seguida, `min` para tempos. Valores ausentes aparecem como `—`. O card não calcula nem inventa um tempo de limpeza, desgaste dos mops ou carga real. Para um sensor de vida útil dos mops, ajuste o rótulo para `Mops · vida útil`.

A movimentação é ilustrativa, baseada no estado do aspirador, e não representa seu mapa ou a posição real na casa. A animação não dispara comandos. Os controles só enviam comandos quando clicados, respeitando as capacidades publicadas pelo aspirador. Iniciar, Pausar e Voltar à base dependem da integração existente do seu aparelho.

O card acompanha as cores do tema do Home Assistant, suporta telas de 320 px ou mais e respeita a preferência do sistema por movimento reduzido. O pacote é independente e desenha o robô e os ícones localmente. Imagens personalizadas são carregadas do caminho que você configurar.

O áudio é gerado localmente, sem arquivos de som nem downloads. Ele só começa após uma interação com um controle habilitado. Atualizações dos sensores e a animação permanecem silenciosas. Se o navegador bloquear o áudio ou não oferecer Web Audio, o comando do botão continua funcionando. Volume zero também desliga o som.

## Tema e cores dentro do card

Abra **Mais controles → Aparência**. Em **Tema do card**, escolha **Automático · Home Assistant**, **Claro**, **Escuro** ou um dos temas disponíveis no seu Home Assistant. Depois escolha as cores de **Textos principais**, **Rótulos e estado** e **Bateria e tempos**. O ajuste vale para este card. **Restaurar aparência** volta às opções configuradas no YAML, ou aos padrões quando não há opções configuradas.

O fundo do card, o piso e os botões usam a mesma paleta. Textos e valores recebem uma correção de contraste quando necessário; a cor aplicada aparece no seletor e um aviso informa o ajuste. Os botões desabilitados continuam legíveis. Trocar a aparência não envia comandos nem reinicia a animação. A escolha do tema, a confirmação de uma cor e a restauração reproduzem o mesmo som de seleção dos outros controles.

As escolhas são salvas localmente no navegador, por painel, entidade e nome. Use `appearance_id` diferente se tiver dois cards iguais no mesmo painel. Outro dispositivo tem suas próprias escolhas. Se o navegador impedir o salvamento, o card continua funcionando e informa que a escolha vale para a sessão. Alterar os padrões de tema ou cor no YAML faz esses novos padrões prevalecerem sobre uma escolha salva anteriormente.

Para definir uma aparência inicial pelo YAML:

```yaml
type: custom:aspirador-vivo-card
entity: vacuum.seu_aspirador
name: Vaccum card-animations
theme: dark
text_color: "#edf4f8"
secondary_text_color: "#aabfcf"
value_color: "#8de3d3"
```

Para um tema existente, use `theme: "ha:Nome do seu tema"`. A opção automática acompanha o tema e o modo claro/escuro do Home Assistant; se o modo não estiver disponível, usa a preferência do sistema. Um tema removido volta temporariamente à aparência automática e mostra um aviso. O nome de exibição do projeto mudou para **Vaccum card-animations**; o tipo `custom:aspirador-vivo-card` e o caminho do recurso continuam compatíveis com as configurações existentes. Um `name` personalizado, como **Bob o Aspirador**, continua sendo usado.

## Seus botões e ícones

No editor visual do cartão, abra **Botões personalizados → Adicionar botão**. Escolha o nome, o ícone e o script do Home Assistant que deverá ser executado. Por exemplo, um script que limpa a sala e outro que ativa os mops. Você pode adicionar, renomear e remover atalhos no editor. **Voltar ao robô** ou a tecla Esc fecha a interface de controles.

Exemplo com scripts que você já criou na integração do seu aparelho:

```yaml
type: custom:aspirador-vivo-card
entity: vacuum.seu_aspirador
custom_buttons:
  - name: Limpar sala
    icon: room
    entity: script.aspirador_limpar_sala
  - name: Limpar cozinha
    icon: kitchen
    entity: script.aspirador_limpar_cozinha
  - name: Limpar com mops
    icon: mop
    entity: script.aspirador_limpar_com_mops
```

Os nomes dos scripts acima são exemplos: substitua-os pelos IDs reais. O card não cria automaticamente os comandos para cômodos ou para os mops, pois eles dependem do modelo e da integração do seu robô. Um atalho sem um script disponível fica desabilitado. Abrir **Mais controles** pausa apenas a animação escondida e não envia um comando de pausa ao aspirador.

Ícones próprios disponíveis: `clean`, `pause`, `stop`, `dock`, `spot`, `locate`, `room`, `kitchen`, `mop`, `fan`, `controls`, `back`, `add` e `trash`. Eles também estão na pasta `icones`, em SVG, para você editar. Um atalho pode usar um ícone do Home Assistant, como `icon: mdi:sofa`, ou uma imagem sua, como `icon_image: /local/icones/meu-icone.svg`. O editor tem um campo para o caminho dessa imagem. Copie a imagem para `/config/www/icones/` no Home Assistant. Se a imagem não carregar, o card usa um ícone próprio como alternativa.

Para trocar os ícones dos controles principais pelo YAML:

```yaml
icons:
  start: clean
  pause: pause
  return: dock
  stop: stop
  spot: spot
  locate: locate
  fan: fan
  more: controls
```

Atalhos avançados podem usar uma ação com `service`, `data` e `target`, em vez de `entity`:

```yaml
custom_buttons:
  - name: Meus mops
    icon: mop
    service: script.turn_on
    target:
      entity_id: script.meus_mops
    data:
      variables:
        intensidade: normal
```

Os controles nativos respeitam os recursos publicados pela entidade `vacuum`. Potência, limpeza pontual e localização aparecem habilitadas apenas quando o aparelho informa suporte. A interface de controles pode aumentar a altura do cartão; no layout de seções, use a altura automática.

## Demonstração

Abra `demo.html` no navegador. Os estados, comandos, bateria e tempos são simulados localmente e não controlam nenhum aparelho. Use **Iniciar limpeza** para ver a animação original e a saída da base; **Pausar** congela o aspirador e **Voltar à base** mostra o retorno. Use **Mais controles** para testar os ícones, a potência e os atalhos de sala, cozinha e mops. Em **Aparência**, teste os temas, as cores e a restauração. Os botões têm som de seleção. Os três scripts e os temas Oceano e Ametista são exemplos simulados na demonstração.

Para executar a validação funcional do arquivo instalado pelo HACS, use `npm test`. O teste não depende de pacotes externos. Ao modificar `aspirador-vivo-card.js`, execute `npm run build` para atualizar `dist/Card-aspirador-.js`, seguido de `npm test` e `npm run check`. A validação também confere que o arquivo do HACS é idêntico ao código do card.

## Se o cartão não aparecer

Confira o caminho do arquivo e o recurso do tipo **Módulo JavaScript**. Pelo HACS, abra `/hacsfiles/Card-aspirador-/Card-aspirador-.js` no seu Home Assistant; pela instalação manual, abra `/local/aspirador-vivo-card.js?v=1.3.0`. Deve aparecer o código, sem erro 404. Depois recarregue o aplicativo e adicione o tipo exato `custom:aspirador-vivo-card`. Ao atualizar uma instalação manual, substitua o arquivo, mude o recurso para `?v=1.3.0` e recarregue o navegador/aplicativo. Pelo HACS, use a opção de atualização ou baixe novamente o card.

## Referências

- [Cards personalizados — documentação oficial](https://developers.home-assistant.io/docs/frontend/custom-ui/custom-card/)
- [Vacuum — estados e ações oficiais](https://www.home-assistant.io/integrations/vacuum/)
- [Entidade vacuum — recursos e estados](https://developers.home-assistant.io/docs/core/entity/vacuum/)
- [Repositórios personalizados no HACS](https://www.hacs.dev/docs/faq/custom_repositories/)
- [Cards de painel no HACS](https://www.hacs.dev/docs/publish/plugin/)

Versão 1.3.0. Código: [Douglaslopes24/Card-aspirador-](https://github.com/Douglaslopes24/Card-aspirador-). A instalação na sua instância do Home Assistant é feita pelos passos acima.
