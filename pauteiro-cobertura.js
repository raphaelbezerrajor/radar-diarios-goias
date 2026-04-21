(function () {
  function normalizeLabel(value) {
    return String(value || "")
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[^a-z0-9]+/g, " ")
      .trim();
  }

  var diaryFamilies = [
    {
      id: "agm",
      label: "AGM / Municipios",
      kind: "municipal_compartilhado",
      url: "https://www.diariomunicipal.com.br/agm/",
      note: "Rota padrao para municipios sem diario proprio confirmado na base."
    },
    {
      id: "goiania",
      label: "Goiania",
      kind: "municipal_proprio",
      url: "https://www.goiania.go.gov.br/casa-civil/diario-oficial/",
      note: "Diario proprio confirmado na base."
    },
    {
      id: "aparecida",
      label: "Aparecida de Goiania",
      kind: "municipal_proprio",
      url: "https://webio.aparecida.go.gov.br/",
      note: "Diario proprio confirmado na base."
    },
    {
      id: "senador-canedo",
      label: "Senador Canedo",
      kind: "municipal_proprio",
      url: "https://diario.senadorcanedo.go.gov.br/",
      note: "Diario proprio confirmado na base."
    },
    {
      id: "anapolis",
      label: "Anapolis",
      kind: "municipal_proprio",
      url: "https://dom.anapolis.go.gov.br/",
      note: "Diario proprio confirmado na base."
    },
    {
      id: "estado",
      label: "Estado de Goias",
      kind: "estadual",
      url: "https://diariooficial.abc.go.gov.br/",
      note: "Diario Oficial do Estado."
    },
    {
      id: "tjgo",
      label: "TJGO",
      kind: "justica",
      url: "https://www.tjgo.jus.br/index.php/processos/dj-eletronico",
      note: "Diario da Justica Eletronico."
    },
    {
      id: "mpgo",
      label: "MPGO",
      kind: "ministerio-publico",
      url: "https://www.mpgo.mp.br/portal/domp",
      note: "Diario Oficial do Ministerio Publico."
    }
  ];

  var overrides = {
    goiania: {
      diary_mode: "proprio_confirmado",
      diary_family: "Goiania",
      diary_url: "https://www.goiania.go.gov.br/casa-civil/diario-oficial/",
      note: "Diario proprio confirmado na base."
    },
    "aparecida de goiania": {
      diary_mode: "proprio_confirmado",
      diary_family: "Aparecida de Goiania",
      diary_url: "https://webio.aparecida.go.gov.br/",
      note: "Diario proprio confirmado na base."
    },
    "senador canedo": {
      diary_mode: "proprio_confirmado",
      diary_family: "Senador Canedo",
      diary_url: "https://diario.senadorcanedo.go.gov.br/",
      note: "Diario proprio confirmado na base."
    },
    anapolis: {
      diary_mode: "proprio_confirmado",
      diary_family: "Anapolis",
      diary_url: "https://dom.anapolis.go.gov.br/",
      note: "Diario proprio confirmado na base."
    },
    trindade: {
      diary_mode: "agm_default",
      diary_family: "AGM / Municipios",
      diary_url: "https://www.diariomunicipal.com.br/agm/",
      note: "Usar AGM como rota principal para Trindade nesta fase da base."
    }
  };

  var loadedCounts = {
    abadiania: { total: 1, 2025: 1, 2026: 0 },
    anapolis: { total: 1, 2025: 0, 2026: 1 },
    "aparecida de goiania": { total: 1, 2025: 0, 2026: 1 },
    cristianopolis: { total: 1, 2025: 1, 2026: 0 },
    goiania: { total: 3, 2025: 2, 2026: 1 },
    goianira: { total: 1, 2025: 1, 2026: 0 },
    itaucu: { total: 1, 2025: 0, 2026: 1 },
    "rio verde": { total: 1, 2025: 0, 2026: 1 },
    "santo antonio do descoberto": { total: 1, 2025: 1, 2026: 0 },
    "senador canedo": { total: 4, 2025: 0, 2026: 4 }
  };

  var prioritySet = new Set([
    "goiania",
    "aparecida de goiania",
    "senador canedo",
    "rio verde",
    "anapolis",
    "trindade",
    "goias"
  ]);

  var rawMunicipalities = `
5200050|Abadia de Goiás
5200100|Abadiânia
5200134|Acreúna
5200159|Adelândia
5200175|Água Fria de Goiás
5200209|Água Limpa
5200258|Águas Lindas de Goiás
5200308|Alexânia
5200506|Aloândia
5200555|Alto Horizonte
5200605|Alto Paraíso de Goiás
5200803|Alvorada do Norte
5200829|Amaralina
5200852|Americano do Brasil
5200902|Amorinópolis
5201108|Anápolis
5201207|Anhanguera
5201306|Anicuns
5201405|Aparecida de Goiânia
5201454|Aparecida do Rio Doce
5201504|Aporé
5201603|Araçu
5201702|Aragarças
5201801|Aragoiânia
5202155|Araguapaz
5202353|Arenópolis
5202502|Aruanã
5202601|Aurilândia
5202809|Avelinópolis
5203104|Baliza
5203203|Barro Alto
5203302|Bela Vista de Goiás
5203401|Bom Jardim de Goiás
5203500|Bom Jesus de Goiás
5203559|Bonfinópolis
5203575|Bonópolis
5203609|Brazabrantes
5203807|Britânia
5203906|Buriti Alegre
5203939|Buriti de Goiás
5203962|Buritinópolis
5204003|Cabeceiras
5204102|Cachoeira Alta
5204201|Cachoeira de Goiás
5204250|Cachoeira Dourada
5204300|Caçu
5204409|Caiapônia
5204508|Caldas Novas
5204557|Caldazinha
5204607|Campestre de Goiás
5204656|Campinaçu
5204706|Campinorte
5204805|Campo Alegre de Goiás
5204854|Campo Limpo de Goiás
5204904|Campos Belos
5204953|Campos Verdes
5205000|Carmo do Rio Verde
5205059|Castelândia
5205109|Catalão
5205208|Caturaí
5205307|Cavalcante
5205406|Ceres
5205455|Cezarina
5205471|Chapadão do Céu
5205497|Cidade Ocidental
5205513|Cocalzinho de Goiás
5205521|Colinas do Sul
5205703|Córrego do Ouro
5205802|Corumbá de Goiás
5205901|Corumbaíba
5206206|Cristalina
5206305|Cristianópolis
5206404|Crixás
5206503|Cromínia
5206602|Cumari
5206701|Damianópolis
5206800|Damolândia
5206909|Davinópolis
5207105|Diorama
5208301|Divinópolis de Goiás
5207253|Doverlândia
5207352|Edealina
5207402|Edéia
5207501|Estrela do Norte
5207535|Faina
5207600|Fazenda Nova
5207808|Firminópolis
5207907|Flores de Goiás
5208004|Formosa
5208103|Formoso
5208152|Gameleira de Goiás
5208400|Goianápolis
5208509|Goiandira
5208608|Goianésia
5208707|Goiânia
5208806|Goianira
5208905|Goiás
5209101|Goiatuba
5209150|Gouvelândia
5209200|Guapó
5209291|Guaraíta
5209408|Guarani de Goiás
5209457|Guarinos
5209606|Heitoraí
5209705|Hidrolândia
5209804|Hidrolina
5209903|Iaciara
5209937|Inaciolândia
5209952|Indiara
5210000|Inhumas
5210109|Ipameri
5210158|Ipiranga de Goiás
5210208|Iporá
5210307|Israelândia
5210406|Itaberaí
5210562|Itaguari
5210604|Itaguaru
5210802|Itajá
5210901|Itapaci
5211008|Itapirapuã
5211206|Itapuranga
5211305|Itarumã
5211404|Itauçu
5211503|Itumbiara
5211602|Ivolândia
5211701|Jandaia
5211800|Jaraguá
5211909|Jataí
5212006|Jaupaci
5212055|Jesúpolis
5212105|Joviânia
5212204|Jussara
5212253|Lagoa Santa
5212303|Leopoldo de Bulhões
5212501|Luziânia
5212600|Mairipotaba
5212709|Mambaí
5212808|Mara Rosa
5212907|Marzagão
5212956|Matrinchã
5213004|Maurilândia
5213053|Mimoso de Goiás
5213087|Minaçu
5213103|Mineiros
5213400|Moiporá
5213509|Monte Alegre de Goiás
5213707|Montes Claros de Goiás
5213756|Montividiu
5213772|Montividiu do Norte
5213806|Morrinhos
5213855|Morro Agudo de Goiás
5213905|Mossâmedes
5214002|Mozarlândia
5214051|Mundo Novo
5214101|Mutunópolis
5214408|Nazário
5214507|Nerópolis
5214606|Niquelândia
5214705|Nova América
5214804|Nova Aurora
5214838|Nova Crixás
5214861|Nova Glória
5214879|Nova Iguaçu de Goiás
5214903|Nova Roma
5215009|Nova Veneza
5215207|Novo Brasil
5215231|Novo Gama
5215256|Novo Planalto
5215306|Orizona
5215405|Ouro Verde de Goiás
5215504|Ouvidor
5215603|Padre Bernardo
5215652|Palestina de Goiás
5215702|Palmeiras de Goiás
5215801|Palmelo
5215900|Palminópolis
5216007|Panamá
5216304|Paranaiguara
5216403|Paraúna
5216452|Perolândia
5216809|Petrolina de Goiás
5216908|Pilar de Goiás
5217104|Piracanjuba
5217203|Piranhas
5217302|Pirenópolis
5217401|Pires do Rio
5217609|Planaltina
5217708|Pontalina
5218003|Porangatu
5218052|Porteirão
5218102|Portelândia
5218300|Posse
5218391|Professor Jamil
5218508|Quirinópolis
5218607|Rialma
5218706|Rianápolis
5218789|Rio Quente
5218805|Rio Verde
5218904|Rubiataba
5219001|Sanclerlândia
5219100|Santa Bárbara de Goiás
5219209|Santa Cruz de Goiás
5219258|Santa Fé de Goiás
5219308|Santa Helena de Goiás
5219357|Santa Isabel
5219407|Santa Rita do Araguaia
5219456|Santa Rita do Novo Destino
5219506|Santa Rosa de Goiás
5219605|Santa Tereza de Goiás
5219704|Santa Terezinha de Goiás
5219712|Santo Antônio da Barra
5219738|Santo Antônio de Goiás
5219753|Santo Antônio do Descoberto
5219803|São Domingos
5219902|São Francisco de Goiás
5220058|São João da Paraúna
5220009|São João d'Aliança
5220108|São Luís de Montes Belos
5220157|São Luiz do Norte
5220207|São Miguel do Araguaia
5220264|São Miguel do Passa Quatro
5220280|São Patrício
5220405|São Simão
5220454|Senador Canedo
5220504|Serranópolis
5220603|Silvânia
5220686|Simolândia
5220702|Sítio d'Abadia
5221007|Taquaral de Goiás
5221080|Teresina de Goiás
5221197|Terezópolis de Goiás
5221304|Três Ranchos
5221403|Trindade
5221452|Trombas
5221502|Turvânia
5221551|Turvelândia
5221577|Uirapuru
5221601|Uruaçu
5221700|Uruana
5221809|Urutaí
5221858|Valparaíso de Goiás
5221908|Varjão
5222005|Vianópolis
5222054|Vicentinópolis
5222203|Vila Boa
5222302|Vila Propício
`.trim();

  var municipalityCatalog = rawMunicipalities.split("\n").map(function (line) {
    var parts = line.split("|");
    var ibgeId = parts[0];
    var name = parts[1];
    var key = normalizeLabel(name);
    var override = overrides[key] || {
      diary_mode: "agm_default",
      diary_family: "AGM / Municipios",
      diary_url: "https://www.diariomunicipal.com.br/agm/",
      note: "Usar AGM como rota padrao enquanto nao houver diario proprio confirmado na base."
    };
    var counts = loadedCounts[key] || { total: 0, 2025: 0, 2026: 0 };

    return {
      ibge_id: ibgeId,
      name: name,
      normalized_name: key,
      priority: prioritySet.has(key),
      diary_mode: override.diary_mode,
      diary_family: override.diary_family,
      diary_url: override.diary_url,
      note: override.note,
      loaded_entries_total: counts.total || 0,
      loaded_entries_2025: counts[2025] || 0,
      loaded_entries_2026: counts[2026] || 0
    };
  });

  var summary = {
    municipalities_total: municipalityCatalog.length,
    own_diary_confirmed: municipalityCatalog.filter(function (item) { return item.diary_mode === "proprio_confirmado"; }).length,
    agm_default: municipalityCatalog.filter(function (item) { return item.diary_mode === "agm_default"; }).length,
    priority_municipalities: municipalityCatalog.filter(function (item) { return item.priority; }).length,
    loaded_municipalities_2025: municipalityCatalog.filter(function (item) { return item.loaded_entries_2025 > 0; }).length,
    loaded_municipalities_2026: municipalityCatalog.filter(function (item) { return item.loaded_entries_2026 > 0; }).length,
    loaded_entries_2025: municipalityCatalog.reduce(function (acc, item) { return acc + item.loaded_entries_2025; }, 0),
    loaded_entries_2026: municipalityCatalog.reduce(function (acc, item) { return acc + item.loaded_entries_2026; }, 0)
  };

  window.PAUTEIRO_COVERAGE = {
    generated_at: "2026-04-21",
    years: [2025, 2026],
    ibge_source: {
      label: "IBGE localidades",
      url: "https://servicodados.ibge.gov.br/api/v1/localidades/estados/52/municipios",
      state: "Goias",
      state_code: 52
    },
    diary_families: diaryFamilies,
    summary: summary,
    municipality_catalog: municipalityCatalog
  };
})();
