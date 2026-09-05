// tests/e2e/lib/fixtures.mjs
// Authoritative test fixtures representing 2025 festival schedule

export const TEST_EVENTS = [
  // --- SEXTA, 5 SETEMBRO ---
  {
    id: 'ev-fri-p25-abril-1900',
    title: 'Abertura & Concerto Inaugural',
    stage: 'Palco 25 de Abril',
    day: '2025-09-05',
    dayCode: 'fri',
    timeStart: '19:00',
    timeEnd: '20:30',
    category: 'Música',
    categoryKey: 'musica',
    description: 'Concerto de abertura com orquestra de sopros e convidados especiais.',
    timeSlot: 'anoitecer',
    highlight: true,
  },
  {
    id: 'ev-fri-paz-2000',
    title: 'Ritmos do Mediterrâneo',
    stage: 'Palco Paz',
    day: '2025-09-05',
    dayCode: 'fri',
    timeStart: '20:00',
    timeEnd: '21:15',
    category: 'Música',
    categoryKey: 'musica',
    description: 'Músicas de intervenção e fusão mediterrânica com cantores convidados.',
    timeSlot: 'anoitecer',
    // Overlaps with ev-fri-p25-abril-1900 (20:00 < 20:30 && 19:00 < 21:15)
  },
  {
    id: 'ev-fri-juv-2345',
    title: 'Coletivo Rima Livre',
    stage: 'Cidade da Juventude',
    day: '2025-09-05',
    dayCode: 'fri',
    timeStart: '23:45',
    timeEnd: '01:15',
    category: 'Música',
    categoryKey: 'musica',
    description: 'Noite de hip-hop e intervenção poética urbana atravessando a meia-noite.',
    timeSlot: 'noite',
    // Midnight crossing
  },
  {
    id: 'ev-fri-juv-0115',
    title: 'Madrugada Bass & Grooves',
    stage: 'Cidade da Juventude',
    day: '2025-09-05',
    dayCode: 'fri',
    timeStart: '01:15',
    timeEnd: '02:00',
    category: 'Música',
    categoryKey: 'musica',
    description: 'Eletrónica e batidas de encerramento da primeira noite.',
    timeSlot: 'noite',
    // Contiguous with ev-fri-juv-2345 (01:15 == 01:15, NO OVERLAP)
  },

  // --- SÁBADO, 6 SETEMBRO ---
  {
    id: 'ev-sat-central-1030',
    title: 'Debate: O Futuro do Trabalho e IA',
    stage: 'Espaço Central',
    day: '2025-09-06',
    dayCode: 'sat',
    timeStart: '10:30',
    timeEnd: '12:00',
    category: 'Debates',
    categoryKey: 'debates',
    description: 'Mesa redonda com sindicalistas, académicos e especialistas em tecnologia.',
    timeSlot: 'manha',
  },
  {
    id: 'ev-sat-crianca-1100',
    title: 'Teatro de Marionetas: O Segredo da Floresta',
    stage: 'Espaço Criança',
    day: '2025-09-06',
    dayCode: 'sat',
    timeStart: '11:00',
    timeEnd: '12:00',
    category: 'Espaço Criança',
    categoryKey: 'crianca',
    description: 'Espetáculo interativo de marionetas para toda a família.',
    timeSlot: 'manha',
    // Overlaps with ev-sat-central-1030 (11:00 < 12:00 && 10:30 < 12:00)
  },
  {
    id: 'ev-sat-ciencia-1400',
    title: 'Oficina Experimental: Física Divertida',
    stage: 'Espaço Ciência',
    day: '2025-09-06',
    dayCode: 'sat',
    timeStart: '14:00',
    timeEnd: '16:00',
    category: 'Ciência & Oficinas',
    categoryKey: 'ciencia',
    description: 'Demonstrações práticas pelo NFIST com lasers, azoto líquido e robótica.',
    timeSlot: 'tarde',
  },
  {
    id: 'ev-sat-paz-1600',
    title: 'Canto Livre & Guitarras de Coimbra',
    stage: 'Palco Paz',
    day: '2025-09-06',
    dayCode: 'sat',
    timeStart: '16:00',
    timeEnd: '17:30',
    category: 'Música',
    categoryKey: 'musica',
    description: 'Baladas de Coimbra e homenagem aos poetas de Abril.',
    timeSlot: 'tarde',
    // Contiguous with ev-sat-ciencia-1400 (16:00 == 16:00, NO OVERLAP)
  },
  {
    id: 'ev-sat-p25-2100',
    title: 'Grande Concerto da Noite: Vozes de Abril',
    stage: 'Palco 25 de Abril',
    day: '2025-09-06',
    dayCode: 'sat',
    timeStart: '21:00',
    timeEnd: '22:30',
    category: 'Música',
    categoryKey: 'musica',
    description: 'Cabeça de cartaz no anfiteatro natural da Quinta da Atalaia.',
    timeSlot: 'noite',
    highlight: true,
  },
  {
    id: 'ev-sat-paz-2100',
    title: 'Folk & Fusão Galaico-Portuguesa',
    stage: 'Palco Paz',
    day: '2025-09-06',
    dayCode: 'sat',
    timeStart: '21:00',
    timeEnd: '22:15',
    category: 'Música',
    categoryKey: 'musica',
    description: 'Gaitas de foles, adufes e percussão tradicional ibérica.',
    timeSlot: 'noite',
    // Exact same start time as ev-sat-p25-2100 (21:00 vs 21:00, OVERLAP)
  },
  {
    id: 'ev-sat-teatro-2330',
    title: 'Peça: A Tempestade e o Povo',
    stage: 'Avanteatro',
    day: '2025-09-06',
    dayCode: 'sat',
    timeStart: '23:30',
    timeEnd: '00:45',
    category: 'Avanteatro & Cinema',
    categoryKey: 'teatro-cine',
    description: 'Dramaturgia contemporânea encenada pela companhia residente.',
    timeSlot: 'noite',
    // Midnight crossing
  },
  {
    id: 'ev-sat-cine-0000',
    title: 'Sessão Cinema: Curtas de Intervenção',
    stage: 'CineAvante!',
    day: '2025-09-06',
    dayCode: 'sat',
    timeStart: '00:00',
    timeEnd: '01:30',
    category: 'Avanteatro & Cinema',
    categoryKey: 'teatro-cine',
    description: 'Projeção ao ar livre de documentários e ficção curta metragem.',
    timeSlot: 'noite',
    // Overlaps past midnight with ev-sat-teatro-2330 (00:00 < 00:45 && 23:30 < 01:30)
  },

  // --- DOMINGO, 7 SETEMBRO ---
  {
    id: 'ev-sun-desp-1000',
    title: 'Torneio Aberto de Xadrez & Ginástica',
    stage: 'Espaço Desporto',
    day: '2025-09-07',
    dayCode: 'sun',
    timeStart: '10:00',
    timeEnd: '11:30',
    category: 'Desporto',
    categoryKey: 'desporto',
    description: 'Atividades desportivas abertas a todos os festivaleiros.',
    timeSlot: 'manha',
  },
  {
    id: 'ev-sun-livro-1500',
    title: 'Lançamento: "Memórias & Lutas; Poesia de Resistência"',
    stage: 'Festa do Livro',
    day: '2025-09-07',
    dayCode: 'sun',
    timeStart: '15:00',
    timeEnd: '16:30',
    category: 'Debates',
    categoryKey: 'debates',
    description: 'Apresentação de obras literárias com sessão de autógrafos com autores.',
    timeSlot: 'tarde',
    // Tests special characters in title and description
  },
  {
    id: 'ev-sun-fado-1700',
    title: 'Guitarradas & Cantares de Lisboa',
    stage: 'Espaço Fado',
    day: '2025-09-07',
    dayCode: 'sun',
    timeStart: '17:00',
    timeEnd: '18:30',
    category: 'Música',
    categoryKey: 'musica',
    description: 'Fado vadio e tertúlia fadista no retiro do Espaço Fado.',
    timeSlot: 'tarde',
  },
  {
    id: 'ev-sun-comicio-1800',
    title: 'Grande Comício de Encerramento',
    stage: 'Palco 25 de Abril',
    day: '2025-09-07',
    dayCode: 'sun',
    timeStart: '18:00',
    timeEnd: '20:00',
    category: 'Debates',
    categoryKey: 'debates',
    description: 'Momento político central da Festa do Avante! no anfiteatro natural.',
    timeSlot: 'anoitecer',
    highlight: true,
    // Overlaps with ev-sun-fado-1700 (18:00 < 18:30 && 17:00 < 20:00)
  },
  {
    id: 'ev-sun-sinf-2100',
    title: 'Concerto Sinfónico de Encerramento',
    stage: 'Auditório 1º de Maio',
    day: '2025-09-07',
    dayCode: 'sun',
    timeStart: '21:00',
    timeEnd: '23:00',
    category: 'Música',
    categoryKey: 'musica',
    description: 'Grande concerto sinfónico interpretando clássicos e temas universais.',
    timeSlot: 'noite',
    highlight: true,
  },
];

export const FIXTURE_BY_ID = new Map(TEST_EVENTS.map((e) => [e.id, e]));

export function getEventById(id) {
  return FIXTURE_BY_ID.get(id);
}

export function getEventsByDay(dayDate) {
  return TEST_EVENTS.filter((e) => e.day === dayDate);
}

export function getEventsByCategory(cat) {
  return TEST_EVENTS.filter((e) => e.category === cat);
}
