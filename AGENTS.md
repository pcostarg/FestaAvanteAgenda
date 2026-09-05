# AvanteRouter — Diretrizes & Arquitetura do Projeto

Documento de contexto persistente para agentes e programadores que trabalham no **AvanteRouter** (FestaAvanteAgenda).

---

## 1. Visão Geral do Projeto
O **AvanteRouter** é uma Progressive Web App (PWA) de alto desempenho, orientada a funcionamento **offline-first** e alojada estaticamente no **GitHub Pages** (com deploy automático via GitHub Actions).
O objetivo é disponibilizar o programa da **Festa do Avante!** (dias 5, 6 e 7 de setembro na Quinta da Atalaia, Seixal) de forma fluida, prática e sem dependência de rede móvel (que costuma falhar ou saturar no recinto da festa).

---

## 2. Stack Tecnológica
* **Bundler & Framework:** Vite + React + TypeScript
* **Estilos:** Tailwind CSS (Dark Mode exclusivo, alto contraste, paleta *Avante Festival Pulse*)
* **Ícones:** Lucide Icons / Material Symbols
* **PWA:** `vite-plugin-pwa` (Workbox, Service Worker cache-first para assets e dados)
* **Alojamento:** GitHub Pages (deploy automático via GitHub Actions em `.github/workflows/deploy.yml` com base path `/FestaAvanteAgenda/`)
* **Gestão de Estado de Utilizador:** Local-first com `localStorage` do browser
* **QR Code & Calendário:** `qrcode` para geração de QR Code, `html5-qrcode` para leitura via câmara/ficheiro, e gerador de ficheiro `.ics` (RFC 5545)

---

## 3. Design System (*Avante Festival Pulse*)
Baseado nas especificações e ecrãs do Google Stitch:
* **Fundo / Base:** `#0B0D0F` (Obsidian ultra-escuro para ecrãs OLED e poupança de bateria)
* **Superfície / Cartões:** `#111316` (Surface) e `#16191E` (Surface Card)
* **Bordas subtis:** `#282E38` e `#3F4756`
* **Cores de Destaque / Marca:**
  * Crimson Brand: `#D32F2F` / `#E53935`
  * Palcos Principais: `#2563EB` (Stage Blue)
  * Debates & Fóruns: `#F59E0B` (Brand Amber) / `#FA6E33` (Accent Orange)
  * Teatro & Cinema: `#F59E0B` (Amber) / `#A855F7` (Purple)
  * Gastronomia / Ciência / Infantil: `#10B981` (Tertiary Green) / `#4EDEA3`
  * Indicador "AO VIVO": `#EF4444` (com efeito de pulso)
* **Tipografia:**
  * Headlines/Display: `Plus Jakarta Sans` (font-bold / font-extrabold)
  * Corpo & Metadados: `Inter` (com números tabulares `font-mono` para horários)

---

## 4. Ecrãs e Funcionalidades Principais
A aplicação organiza-se em **3 vistas principais** (navegação por abas no topo em Desktop e Bottom Bar fixa em Mobile):

1. **Grelha de Palcos (`/grelha`)**:
   * Matriz temporal horizontal por palco (Palco 25 de Abril, Palco Paz, Auditório 1º de Maio, Cidade da Juventude, Espaço Central, Avanteatro, etc.).
   * Eixo temporal contínuo (das 10:00 às 02:00).
   * Indicador vertical em tempo real ("AGORA / TEMPO REAL") que acompanha o horário do festival.

2. **Lista Cronológica (`/lista`)**:
   * Feed ordenado cronologicamente, segmentado por blocos temporais (Manhã, Tarde, Anoitecer, Noite Principal).
   * Seletor de dia (Sexta 5, Sábado 6, Domingo 7).
   * Filtros por categoria (Música, Debates, Teatro, Cinema, Família/Criança, Desporto).
   * Campo de pesquisa rápida com atalho de teclado (`/`).
   * Botão de marcação rápida de Favorito (Estrela).

3. **O Meu Horário (`/o-meu-horario`)**:
   * Lista linear e limpa apenas com os eventos guardados pelo utilizador para o dia selecionado.
   * **Deteção de Sobreposição / Conflitos**: Banner de aviso em destaque âmbar se 2 ou mais eventos guardados coincidirem na mesma hora, destacando os cartões em conflito.
   * **Marcação "Já vi"**: Botão de visto (check ✓) em cada cartão que risca/atenua o evento concluído, com filtro "Ocultar já vistos".
   * **Contador dinâmico** de eventos guardados.
   * **Estado vazio** com chamada para ação ("Explorar Programa").

---

## 5. Gestão de Dados e Partilha
* **Dados do Programa:**
  * Ficheiro estático pré-populado `src/data/program.json`.
  * Script Node.js `scripts/scrape-avante.mjs` (`npm run scrape`) para atualizar a partir de `https://www.festadoavante.pcp.pt/2025/programa`.
* **Dados do Utilizador:**
  * Guardados sob a chave `avante_schedule_v1` em `localStorage`.
  * Estrutura: `{ favorites: string[], seen: string[], updatedAt: number }`.
* **Exportação:**
  * **QR Code:** Gera um QR Code compacto no ecrã (com URL `?import=...` ou payload serializado).
  * **Ficheiro JSON:** Download de `minha-agenda-avante.json`.
  * **Calendário ICS:** Download de `meu_avante_2025.ics` compatível com Google Calendar, Apple Calendar e Outlook.
* **Importação:**
  * Leitura de QR Code via câmara do telemóvel ou upload de imagem.
  * Importação de ficheiro `.json`.
  * Resolução: **Substituição direta e silenciosa** dos dados locais pelos dados importados (conforme decisão de arquitetura).

---

## 6. Regras de Engenharia
* **Zero Backend obrigatório:** Toda a lógica corre 100% no cliente.
* **Resiliência Offline:** Assets estáticos, fontes e dados cacheados via Service Worker.
* **Compatibilidade Mobile:** Ergonomia da thumb-zone, suporte para safe-area-insets (notches de iOS/Android).
