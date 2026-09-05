# FestaAvanteAgenda (AvanteRouter)

> Progressive Web App (PWA) de alto desempenho, funcionamento **100% offline** e design dark mode (*Avante Festival Pulse* inspirado no Google Stitch) para consulta e gestão pessoal da programação da **Festa do Avante! 2025** (5, 6 e 7 de setembro na Quinta da Atalaia, Seixal).

---

## 🚀 Funcionalidades Principais

* **⚡ 100% Offline-First (PWA):**
  * Funciona sem rede no recinto da festa através de Service Worker com cache preemptiva de todos os assets e dados.
  * Instalável em telemóveis Android, iPhone (iOS Safari "Adicionar ao ecrã principal") e Desktop.
* **📅 3 Vistas de Programação (Fiéis ao Google Stitch):**
  1. **Grelha de Palcos (`/grelha`)**: Matriz temporal contínua das 10:00 às 02:00 por palcos com linha vertical "AGORA" em tempo real e destaque "AO VIVO".
  2. **Lista Cronológica (`/lista`)**: Feed linear agrupado por períodos do dia (Manhã, Tarde, Anoitecer, Noite Principal), com pesquisa por texto (atalho `/`), seletor de dias e filtros de categorias.
  3. **O Meu Horário (`/o-meu-horario`)**: Lista limpa de eventos guardados para o dia selecionado.
* **⚠️ Deteção Inteligente de Conflitos / Sobreposição:**
  * Alerta visual em banner âmbar quando 2 ou mais concertos/debates guardados coincidem na mesma hora, com destaque nos cartões em sobreposição e modal de resolução.
* **✅ Marcação "Já vi" (✓):**
  * Marcação rápida de concertos e espetáculos assistidos, com atenuação visual e filtro "Ocultar já vistos".
* **📲 Partilha e Sincronização Flexível:**
  * **Exportação:** Geração de QR Code no ecrã, download de `minha-agenda-avante.json` e exportação para calendário nativo `meu_avante_2025.ics` (Apple Calendar, Google Calendar, Outlook).
  * **Importação:** Leitura de QR Code pela câmara do telemóvel, leitura por upload de imagem de QR Code, importação de ficheiro JSON de backup e links diretos via URL (`?import=...`).
* **🔄 Base de Dados & Scraper Resiliente:**
  * 269 eventos autênticos de 2025 cobrindo os 9 palcos principais (Palco 25 de Abril, Palco Paz, Auditório 1º de Maio, Cidade da Juventude, Espaço Central, Avanteatro, CineAvante, Espaço Criança, Ciência & Desporto).
  * Script em Node.js (`npm run scrape`) com timeouts, retries, cabeçalhos de navegador e cache de fallback.

---

## 🛠️ Stack Tecnológica

* **Framework:** React 18 + TypeScript + Vite
* **Estilos:** Tailwind CSS (Dark Mode de alto contraste, otimizado para ecrãs OLED)
* **PWA:** `vite-plugin-pwa` (Workbox)
* **Ícones:** Lucide React
* **QR Code:** `qrcode` (geração) e `html5-qrcode` (leitura por câmara e ficheiro)
* **Calendário:** Gerador de formato RFC 5545 (iCalendar `.ics`)
* **CI/CD:** GitHub Actions (`.github/workflows/deploy.yml`) para GitHub Pages

---

## 💻 Como Executar Localmente

### 1. Clonar e Instalar Dependências
```bash
git clone https://github.com/pcostarg/FestaAvanteAgenda.git
cd FestaAvanteAgenda
npm install
```

### 2. Iniciar o Servidor de Desenvolvimento
```bash
npm run dev
```
Abra o browser em `http://localhost:5173/FestaAvanteAgenda/`.

### 3. Executar os Testes Automatizados
```bash
npm test
```
Executa a suite completa de 320 testes de ponta a ponta (verificação de dados, armazenamento local, deteção de conflitos, filtros, QR e exportação).

### 4. Verificar Tipos TypeScript
```bash
npm run typecheck
```

### 5. Compilar para Produção (Build PWA)
```bash
npm run build
```
Gera os ficheiros estáticos e o Service Worker PWA na pasta `dist/`. Para pré-visualizar o build:
```bash
npm run preview
```

### 6. Atualizar os Dados do Programa (Scraper)
```bash
npm run scrape
```
Atualiza o ficheiro `src/data/program.json` a partir do site oficial da Festa do Avante!.

---

## 🌐 Deploy Automático no GitHub Pages

O projeto inclui um workflow de CI/CD em [`.github/workflows/deploy.yml`](.github/workflows/deploy.yml).

### Passos para ativar no GitHub:
1. No teu repositório no GitHub, vai a **Settings** > **Pages**.
2. Em **Build and deployment** > **Source**, seleciona **GitHub Actions**.
3. Sempre que fizeres push para a branch `main` (ou acionares manualmente via **Actions** > **Run workflow**), o GitHub Actions compila e publica a aplicação automaticamente no URL:
   ```
   https://pcostarg.github.io/FestaAvanteAgenda/
   ```

---

## 📄 Licença
Distribuído sob a licença MIT. Consulta o ficheiro [LICENSE](LICENSE) para mais detalhes.
