const pdfs = [
  "_01 SNC1W Earth & Space Science Table of Contents.pdf",
  "1.0 Introduction to Astronomy.pdf",
  "1.2 Astronomy 101.pdf",
  "2.0 Interactions Between the Earth, Moon, and Sun.pdf",
  "KEVIN JING - 3.2 Constellations WebQuest.pdf",
  "4.0 Light & Spectroscopy.pdf",
  "4.2k Analysing Spectral Patterns - w.s..pdf",
  "4a.3 Spectra examples Apr 2026.pdf",
  "4.4k Red Shift, Blue Shift w.s..pdf",
  "5.0k Stars.pdf",
  "5.2 Life Cycle of a Star Review Worksheet.pdf",
  "5.3 Properties of Star Practice .pdf",
  "6.0k The Big Bang Theory & Beyond.pdf",
  "6.2 Evidence for Big Bang - worksheet.pdf",
  "7 (2026) Space Exploration & Artemis II.pdf",
  "other resources.txt"
];

const topics = [
  {
    title: "Astronomy Foundations",
    pdfs: ["1.0 Introduction to Astronomy.pdf", "1.2 Astronomy 101.pdf"],
    points: [
      "Astronomy is the scientific study of objects and events beyond Earth's atmosphere.",
      "A solar system contains a star and the objects that orbit it.",
      "A galaxy is a huge system of stars, gas, dust, and dark matter held together by gravity.",
      "A light-year is a distance, not a time. It is the distance light travels in one year."
    ],
    terms: ["astronomy", "solar system", "galaxy", "universe", "light-year"],
    target: "Use correct scale words: planet < solar system < galaxy < universe."
  },
  {
    title: "Earth, Moon, and Sun",
    pdfs: ["2.0 Interactions Between the Earth, Moon, and Sun.pdf"],
    points: [
      "Earth rotates once about every 24 hours, causing day and night.",
      "Earth revolves around the Sun once per year.",
      "The Moon revolves around Earth, and the changing Sun-lit portion creates phases.",
      "Eclipses require careful alignment of the Sun, Earth, and Moon.",
      "Tides are mainly caused by the Moon's gravity, with the Sun also contributing."
    ],
    terms: ["rotation", "revolution", "phase", "solar eclipse", "lunar eclipse", "tide"],
    target: "For diagrams, always identify the light source first, then positions and shadows."
  },
  {
    title: "Constellations",
    pdfs: ["KEVIN JING - 3.2 Constellations WebQuest.pdf"],
    points: [
      "A constellation is a recognized star pattern seen from Earth.",
      "Stars in a constellation may look close together but can be very far apart in space.",
      "Constellations help with sky navigation and seasonal observations.",
      "Different cultures have used different star stories and names."
    ],
    terms: ["constellation", "asterism", "apparent pattern", "seasonal sky"],
    target: "Do not assume stars in a pattern are physically close to each other."
  },
  {
    title: "Light and Spectroscopy",
    pdfs: ["4.0 Light & Spectroscopy.pdf", "4.2k Analysing Spectral Patterns - w.s..pdf", "4a.3 Spectra examples Apr 2026.pdf"],
    points: [
      "Light travels as electromagnetic radiation.",
      "Visible light is only one part of the electromagnetic spectrum.",
      "A spectrum separates light by wavelength or colour.",
      "Spectral lines can identify elements because each element has a unique pattern.",
      "Astronomers use spectra to study stars without touching or visiting them."
    ],
    terms: ["wavelength", "frequency", "spectrum", "emission line", "absorption line"],
    target: "Match unknown spectra by comparing line positions, not by guessing the colour names."
  },
  {
    title: "Red Shift and Blue Shift",
    pdfs: ["4.4k Red Shift, Blue Shift w.s..pdf", "6.0k The Big Bang Theory & Beyond.pdf"],
    points: [
      "Red shift means spectral lines move toward longer wavelengths and the object is moving away.",
      "Blue shift means spectral lines move toward shorter wavelengths and the object is moving toward us.",
      "Most distant galaxies are red-shifted, which supports an expanding universe.",
      "Greater red shift often suggests greater recession speed."
    ],
    terms: ["red shift", "blue shift", "Doppler effect", "expanding universe"],
    target: "Red = away, blue = toward. Then connect galaxy red shifts to expansion."
  },
  {
    title: "Stars and Properties",
    pdfs: ["5.0k Stars.pdf", "5.3 Properties of Star Practice .pdf"],
    points: [
      "A star is a massive sphere of hot gas/plasma that produces energy by nuclear fusion.",
      "Star colour is linked to surface temperature: blue stars are hotter than red stars.",
      "Brightness depends on luminosity, distance, and size.",
      "Mass strongly affects a star's lifetime and final stage.",
      "The Sun is a medium-sized main sequence star."
    ],
    terms: ["nuclear fusion", "luminosity", "apparent brightness", "absolute brightness", "main sequence"],
    target: "When comparing stars, say whether you are discussing temperature, size, distance, or luminosity."
  },
  {
    title: "Life Cycle of a Star",
    pdfs: ["5.2 Life Cycle of a Star Review Worksheet.pdf", "5.0k Stars.pdf"],
    points: [
      "Stars form in nebulae from gas and dust pulled together by gravity.",
      "A star spends most of its life on the main sequence.",
      "Low/medium-mass stars can become red giants, planetary nebulae, and white dwarfs.",
      "High-mass stars can become supergiants, supernovae, neutron stars, or black holes.",
      "Initial mass is the key factor controlling the pathway."
    ],
    terms: ["nebula", "protostar", "main sequence", "red giant", "supernova", "black hole"],
    target: "For lifecycle questions, start with mass: low/medium mass or high mass."
  },
  {
    title: "Big Bang Evidence",
    pdfs: ["6.0k The Big Bang Theory & Beyond.pdf", "6.2 Evidence for Big Bang - worksheet.pdf"],
    points: [
      "The Big Bang theory says the universe began in a very hot, dense state and has expanded over time.",
      "Galaxy red shift supports expansion.",
      "Cosmic microwave background radiation is leftover radiation from the early universe.",
      "The abundance of light elements such as hydrogen and helium also supports the model.",
      "The Big Bang explains expansion; it is not an explosion into empty space from one point in space."
    ],
    terms: ["Big Bang theory", "cosmic microwave background", "red shift", "light elements"],
    target: "Use evidence words: red shift, CMB, and hydrogen/helium abundance."
  },
  {
    title: "Space Exploration and Artemis II",
    pdfs: ["7 (2026) Space Exploration & Artemis II.pdf", "7 (2026) Space Exploration & Artemis II (1).pdf"],
    points: [
      "Space exploration uses scientific, engineering, and human teamwork to study space.",
      "Robotic missions can gather data without risking human life.",
      "Human missions allow flexible problem solving but require life support and safety planning.",
      "Artemis II is a crewed Moon mission connected to NASA's return-to-the-Moon program.",
      "Canadian space science connects to robotics, astronaut training, and international missions."
    ],
    terms: ["robotic mission", "crewed mission", "Artemis II", "life support", "space technology"],
    target: "For 4+ answers, discuss benefits and limits, not only facts."
  }
];

const figures = {
  moon: `<svg viewBox="0 0 760 270" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="Sun Earth Moon alignment">
    <rect width="760" height="270" fill="#f8faf8"/><circle cx="90" cy="135" r="54" fill="#f7c948"/><text x="90" y="220" text-anchor="middle" font-family="Arial" font-size="18">Sun</text>
    <circle cx="380" cy="135" r="44" fill="#4c78a8"/><text x="380" y="220" text-anchor="middle" font-family="Arial" font-size="18">Earth</text>
    <circle cx="610" cy="135" r="28" fill="#c9c9c9"/><text x="610" y="220" text-anchor="middle" font-family="Arial" font-size="18">Moon</text>
    <path d="M145 115 L336 130" stroke="#e3b341" stroke-width="5"/><path d="M145 155 L336 140" stroke="#e3b341" stroke-width="5"/>
    <path d="M425 135 L582 135" stroke="#667" stroke-width="18" opacity="0.35"/><text x="495" y="82" font-family="Arial" font-size="16">Earth's shadow direction</text>
  </svg>`,
  spectra: `<svg viewBox="0 0 760 260" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="Spectral line comparison">
    <rect width="760" height="260" fill="#f8faf8"/><text x="40" y="48" font-family="Arial" font-size="18" font-weight="700">Reference Hydrogen</text>
    <rect x="230" y="30" width="420" height="34" fill="#101820"/><g stroke-width="6"><line x1="295" y1="30" x2="295" y2="64" stroke="#6ab7ff"/><line x1="370" y1="30" x2="370" y2="64" stroke="#8ce99a"/><line x1="505" y1="30" x2="505" y2="64" stroke="#ffd43b"/><line x1="590" y1="30" x2="590" y2="64" stroke="#ff6b6b"/></g>
    <text x="40" y="132" font-family="Arial" font-size="18" font-weight="700">Galaxy A</text><rect x="230" y="114" width="420" height="34" fill="#101820"/><g stroke-width="6"><line x1="325" y1="114" x2="325" y2="148" stroke="#6ab7ff"/><line x1="400" y1="114" x2="400" y2="148" stroke="#8ce99a"/><line x1="535" y1="114" x2="535" y2="148" stroke="#ffd43b"/><line x1="620" y1="114" x2="620" y2="148" stroke="#ff6b6b"/></g>
    <text x="40" y="214" font-family="Arial" font-size="18" font-weight="700">Galaxy B</text><rect x="230" y="196" width="420" height="34" fill="#101820"/><g stroke-width="6"><line x1="270" y1="196" x2="270" y2="230" stroke="#6ab7ff"/><line x1="345" y1="196" x2="345" y2="230" stroke="#8ce99a"/><line x1="480" y1="196" x2="480" y2="230" stroke="#ffd43b"/><line x1="565" y1="196" x2="565" y2="230" stroke="#ff6b6b"/></g>
  </svg>`,
  star: `<svg viewBox="0 0 760 330" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="Star temperature and brightness graph">
    <rect width="760" height="330" fill="#f8faf8"/><line x1="90" y1="270" x2="690" y2="270" stroke="#222" stroke-width="3"/><line x1="90" y1="270" x2="90" y2="40" stroke="#222" stroke-width="3"/>
    <text x="345" y="312" font-family="Arial" font-size="18">Surface temperature decreases to the right</text><text x="18" y="168" transform="rotate(-90 18 168)" font-family="Arial" font-size="18">Luminosity</text>
    <circle cx="170" cy="90" r="20" fill="#6ab7ff"/><text x="200" y="96" font-family="Arial" font-size="16">Blue giant</text>
    <circle cx="365" cy="170" r="14" fill="#fff176" stroke="#c8a500"/><text x="390" y="176" font-family="Arial" font-size="16">Sun-like star</text>
    <circle cx="600" cy="230" r="11" fill="#ff8a65"/><text x="620" y="236" font-family="Arial" font-size="16">Red dwarf</text>
    <path d="M155 82 C280 130 420 175 615 235" fill="none" stroke="#315c83" stroke-width="4" stroke-dasharray="8 8"/>
  </svg>`,
  bigbang: `<img src="Big%20Bang%20PXL_20251118_161116801.jpg" alt="Teacher Big Bang classroom image" />`
};

const quizzes = [
  {
    id: "easy",
    title: "Easy Quiz",
    summary: "Core vocabulary and direct teacher-note facts.",
    mc: [
      q("Astronomy is the study of:", ["Earth's weather only", "Objects and events beyond Earth", "Rocks under Earth's crust", "Human body systems"], 1, "Astronomy"),
      q("A light-year measures:", ["Time", "Temperature", "Distance", "Brightness"], 2, "Astronomy"),
      q("Earth's rotation causes:", ["Day and night", "The seasons only", "Lunar eclipses every day", "Star birth"], 0, "Earth-Moon-Sun"),
      q("Earth's revolution around the Sun takes about:", ["24 hours", "7 days", "1 month", "1 year"], 3, "Earth-Moon-Sun"),
      q("The Moon's phases are caused by:", ["Earth's clouds", "Changing visible sunlight on the Moon", "The Moon producing its own light", "The Sun turning off"], 1, "Moon Phases"),
      q("A solar eclipse happens when:", ["Earth is between the Sun and Moon", "The Moon is between the Sun and Earth", "Mars blocks the Sun", "The Sun is between Earth and the Moon"], 1, "Eclipses", figures.moon),
      q("A constellation is:", ["A real cluster where all stars touch", "A recognized star pattern seen from Earth", "A type of galaxy", "A Moon phase"], 1, "Constellations"),
      q("Visible light is part of the:", ["Rock cycle", "Electromagnetic spectrum", "Water cycle", "Plate boundary"], 1, "Light"),
      q("A spectrum is useful because it can show:", ["Only a planet's mass", "Element patterns in light", "The age of a textbook", "Earthquake size"], 1, "Spectroscopy"),
      q("An emission line pattern can help identify:", ["Elements in a star", "The number of astronauts", "The shape of a constellation story", "The Moon's diameter only"], 0, "Spectroscopy"),
      q("Red shift means an object is usually moving:", ["Toward us", "Away from us", "Sideways only", "In a circle around Earth"], 1, "Red Shift"),
      q("Blue stars are generally:", ["Cooler than red stars", "Hotter than red stars", "Always closer to Earth", "Not real stars"], 1, "Stars"),
      q("The Sun is mainly a:", ["Main sequence star", "Black hole", "White dwarf only", "Nebula"], 0, "Stars"),
      q("Stars are born in:", ["Nebulae", "Tides", "Craters", "Spectroscopes"], 0, "Life Cycle"),
      q("A high-mass star may end as:", ["A neutron star or black hole", "A planet", "A comet", "A tide"], 0, "Life Cycle"),
      q("The Big Bang theory describes:", ["Formation of only the Moon", "Expansion of the universe from a hot dense state", "A solar eclipse", "A constellation map"], 1, "Big Bang"),
      q("Cosmic microwave background radiation is:", ["Leftover radiation from the early universe", "A type of Moon rock", "A telescope brand", "A star's surface colour"], 0, "Big Bang"),
      q("Most distant galaxies are:", ["Red-shifted", "Blue-shifted only", "Not moving", "Inside our solar system"], 0, "Big Bang"),
      q("Robotic space missions are useful because they:", ["Need no instruments", "Can collect data with less risk to humans", "Cannot leave Earth", "Replace all science"], 1, "Space Exploration"),
      q("Artemis II is connected to:", ["Return-to-the-Moon exploration", "Deep ocean mining", "The rock cycle", "Weather forecasting only"], 0, "Artemis II")
    ],
    short: [
      sa("Explain the difference between rotation and revolution.", "Rotation is spinning on an axis, such as Earth causing day and night. Revolution is orbiting another object, such as Earth orbiting the Sun once per year."),
      sa("Why do we see Moon phases?", "We see different amounts of the Moon's sunlit half as the Moon revolves around Earth."),
      sa("How can spectra help astronomers study stars?", "Spectra show patterns of light lines. These patterns help identify elements and can show motion through red shift or blue shift."),
      sa("Give two pieces of evidence for the Big Bang theory.", "Good answers include galaxy red shift, cosmic microwave background radiation, and the abundance of light elements such as hydrogen and helium."),
      sa("Name one advantage and one challenge of human space exploration.", "An advantage is flexible human problem solving. A challenge is keeping astronauts alive and safe with life support, radiation protection, and mission planning.")
    ],
    definitions: [
      def("Light-year", "A light-year is the distance light travels in one year."),
      def("Red shift", "Red shift is the movement of spectral lines toward longer wavelengths, usually showing that an object is moving away.")
    ]
  },
  {
    id: "medium",
    title: "Medium Quiz",
    summary: "Application questions using diagrams, spectra, star properties, and evidence.",
    mc: [
      q("If a spectral pattern shifts to the right toward red wavelengths, the object is:", ["Moving away", "Moving toward us", "Becoming invisible", "Turning into a planet"], 0, "Spectral Analysis", figures.spectra),
      q("In the figure, Galaxy A is best described as:", ["Red-shifted", "Blue-shifted", "No shift", "A Moon phase"], 0, "Spectral Analysis", figures.spectra),
      q("In the figure, Galaxy B is best described as:", ["Red-shifted", "Blue-shifted", "No shift", "A solar eclipse"], 1, "Spectral Analysis", figures.spectra),
      q("A star that appears dim could be:", ["Only low temperature", "Far away, low luminosity, or both", "Definitely a black hole", "Definitely blue"], 1, "Star Brightness"),
      q("On the star graph, the blue giant is:", ["Hot and luminous", "Cool and dim", "Cool and luminous", "Hot and dim"], 0, "Star Graph", figures.star),
      q("On the star graph, the red dwarf is:", ["Hot and bright", "Cool and dim", "A supernova", "Not a star"], 1, "Star Graph", figures.star),
      q("Which factor most controls a star's life cycle path?", ["Initial mass", "Constellation name", "Distance from Earth only", "Human exploration"], 0, "Life Cycle"),
      q("A low/medium-mass star like the Sun is expected to become a:", ["Supernova then black hole", "Red giant then white dwarf", "Planet immediately", "Galaxy"], 1, "Life Cycle"),
      q("A high-mass star can explode as a:", ["Supernova", "Lunar eclipse", "Tide", "Constellation"], 0, "Life Cycle"),
      q("The correct scale order is:", ["Universe, planet, galaxy, solar system", "Planet, solar system, galaxy, universe", "Galaxy, planet, universe, solar system", "Solar system, planet, universe, galaxy"], 1, "Scale"),
      q("Why are stars in a constellation not necessarily close together?", ["They are seen along the same line of sight from Earth", "They are all in one small box", "They are all planets", "They orbit the Moon"], 0, "Constellations"),
      q("Tides are mainly caused by:", ["The Moon's gravity", "Star colour", "Spectral lines", "CMB radiation"], 0, "Earth-Moon-Sun"),
      q("During a lunar eclipse:", ["The Moon's shadow falls on Earth", "Earth's shadow falls on the Moon", "The Sun blocks Earth", "The Moon creates its own light"], 1, "Eclipses"),
      q("Which statement is strongest evidence for expansion?", ["Many distant galaxies are red-shifted", "The Moon has phases", "Constellations have names", "Astronauts train underwater"], 0, "Big Bang"),
      q("CMB radiation supports the Big Bang because it is:", ["Leftover early-universe radiation", "A nearby star", "A type of eclipse", "Visible sunlight only"], 0, "Big Bang"),
      q("Hydrogen and helium abundance matters because:", ["The early universe model predicts many light elements", "They are Moon phases", "They prove Earth is flat", "They are telescope parts"], 0, "Big Bang"),
      q("A crewed mission is harder than a robotic mission because it needs:", ["Life support and crew safety systems", "No communication", "No energy", "No planning"], 0, "Exploration"),
      q("Robotic missions are often chosen for dangerous environments because they:", ["Reduce human risk", "Cannot use instruments", "Need oxygen", "Only work on Earth"], 0, "Exploration"),
      q("The electromagnetic spectrum includes:", ["Radio, infrared, visible, ultraviolet, X-rays", "Only red and blue paint", "Only sound waves", "Only planets"], 0, "Light"),
      q("The best way to match an unknown element spectrum is to compare:", ["Line positions", "Paragraph length", "Planet names", "Random colours"], 0, "Spectroscopy")
    ],
    short: [
      sa("Use the spectra figure to explain how you know Galaxy A is moving away.", "Galaxy A's lines are shifted toward the red/longer wavelength side compared with the reference lines, so it is moving away."),
      sa("Compare apparent brightness and luminosity.", "Apparent brightness is how bright a star looks from Earth. Luminosity is the star's actual energy output."),
      sa("Explain why mass matters in a star's life cycle.", "Mass controls pressure, temperature, fuel use, lifetime, and final stage. High-mass stars can become supernovae, neutron stars, or black holes."),
      sa("Why is CMB radiation important evidence?", "It is leftover radiation from the early universe, matching the prediction that the universe began hot and dense."),
      sa("Give a balanced comparison of robotic and crewed missions.", "Robotic missions lower human risk and can be cheaper for dangerous places. Crewed missions allow flexible decisions but require life support, food, water, protection, and return planning.")
    ],
    definitions: [
      def("Spectrum", "A spectrum is light spread out by wavelength or colour, often showing line patterns."),
      def("Constellation", "A constellation is a recognized star pattern as seen from Earth.")
    ]
  },
  {
    id: "hard",
    title: "Hard Quiz",
    summary: "4+ style reasoning: connect evidence, diagrams, and precise science language.",
    mc: [
      q("The Big Bang should be described as:", ["An explosion into empty space from one centre", "Expansion of space from a hot dense early state", "The formation of only our solar system", "A star exploding yesterday"], 1, "Big Bang Reasoning", figures.bigbang),
      q("Which answer best combines two Big Bang evidence lines?", ["Moon phases and tides", "Red shift and CMB radiation", "Constellations and seasons", "Artemis and eclipses"], 1, "Evidence"),
      q("If Galaxy X has a larger red shift than Galaxy Y, Galaxy X is likely:", ["Receding faster", "Moving slower toward us", "Inside the Moon", "Not made of atoms"], 0, "Red Shift"),
      q("An unknown spectrum has the same spacing pattern as hydrogen but shifted red. The best conclusion is:", ["Hydrogen is present and moving away", "No hydrogen is present", "It must be a Moon rock", "It proves the star is cold only"], 0, "Spectroscopy"),
      q("A blue, very luminous star will probably have:", ["High surface temperature and high mass", "Low temperature and no fusion", "The longest lifetime of all stars", "No gravity"], 0, "Stars", figures.star),
      q("Why do massive stars usually have shorter lives?", ["They use fuel much faster", "They have no fusion", "They are always closer to Earth", "They are constellations"], 0, "Stars"),
      q("Which pathway matches a high-mass star?", ["Nebula -> protostar -> main sequence -> supergiant -> supernova", "Nebula -> Moon -> tide -> planet", "Galaxy -> eclipse -> white dwarf", "Comet -> main sequence -> CMB"], 0, "Life Cycle"),
      q("Which pathway matches a Sun-like star?", ["Main sequence -> red giant -> planetary nebula -> white dwarf", "Main sequence -> supernova -> black hole always", "Moon -> planet -> galaxy", "CMB -> nebula -> tide"], 0, "Life Cycle"),
      q("A lunar eclipse is less common than every full Moon because:", ["The Moon's orbit is tilted, so alignment is not always exact", "The Moon stops orbiting", "The Sun is too cold", "Earth has no shadow"], 0, "Eclipses"),
      q("For a solar eclipse diagram, the correct alignment is:", ["Sun-Moon-Earth", "Moon-Earth-Sun", "Earth-Sun-Moon", "Earth-Mars-Sun"], 0, "Eclipses", figures.moon),
      q("A strong figure-analysis answer should first identify:", ["The light source or axis/scale", "The prettiest colour", "The file name", "The longest word"], 0, "Figure Analysis"),
      q("If a star has high luminosity but low apparent brightness, it may be:", ["Very far away", "Inside Earth", "Not emitting light", "A Moon phase"], 0, "Brightness"),
      q("Why can spectroscopy identify elements in distant stars?", ["Elements have unique spectral line patterns", "Stars send rock samples", "All elements are identical", "The Moon labels them"], 0, "Spectroscopy"),
      q("Which statement about constellations is most scientifically accurate?", ["They are apparent patterns from Earth's viewpoint", "All stars in one constellation are the same distance", "They are all galaxies", "They cause tides"], 0, "Constellations"),
      q("Which is a limitation of human space exploration?", ["Radiation and life-support risk", "No need for oxygen", "No science can be done", "Robots cannot help"], 0, "Exploration"),
      q("Which is a benefit of Artemis-style missions?", ["Testing technology and preparing future lunar exploration", "Stopping Earth's rotation", "Creating red shift", "Removing gravity"], 0, "Artemis II"),
      q("Which evidence would best support an expanding universe in a data table?", ["Greater galaxy distance linked with greater red shift", "Moon phases listed by month", "Astronaut names alphabetically", "Star stories from cultures"], 0, "Big Bang"),
      q("If a student says, 'A light-year is how long light shines,' the correction is:", ["It is a distance light travels in one year", "It is a star's colour", "It is a Moon phase", "It is a telescope"], 0, "Astronomy"),
      q("The strongest comparison of blue shift and red shift is:", ["Blue shift means toward; red shift means away", "Both always mean away", "Both only happen to planets", "Neither involves wavelength"], 0, "Doppler Effect"),
      q("For a 4+ answer, the best response usually includes:", ["Claim, evidence, and scientific vocabulary", "Only one word", "A guess with no explanation", "A copied title only"], 0, "Test Skill")
    ],
    short: [
      sa("Analyze the Big Bang image/resource as evidence. What should a strong answer mention?", "A strong answer should connect the visual or resource to evidence such as galaxy red shift, cosmic microwave background radiation, and the abundance of hydrogen and helium. It should say the universe has expanded from a hot dense early state."),
      sa("Explain how red shift evidence supports an expanding universe.", "If many distant galaxies show red shift, their light is stretched toward longer wavelengths. This means they are moving away, supporting the idea that space is expanding."),
      sa("Use mass to compare the final stages of low/medium-mass and high-mass stars.", "Low/medium-mass stars can become red giants, planetary nebulae, and white dwarfs. High-mass stars can become supergiants, explode as supernovae, and leave neutron stars or black holes."),
      sa("Explain why a constellation is useful but can be misleading.", "It is useful for navigation and locating sky regions, but misleading because stars that look close together from Earth may be very far apart in three-dimensional space."),
      sa("Give a 4+ comparison of robotic and crewed exploration.", "Robotic exploration reduces risk to humans and can collect data in dangerous places. Crewed exploration allows flexible decisions and repairs, but it is more complex because astronauts need life support, protection, training, and safe return planning.")
    ],
    definitions: [
      def("Cosmic microwave background radiation", "CMB radiation is leftover radiation from the early universe and is major evidence for the Big Bang theory."),
      def("Luminosity", "Luminosity is the actual amount of energy or light a star gives off per second.")
    ]
  }
];

function q(text, options, answer, topic, figure = "") {
  return { text, options, answer, topic, figure };
}

function sa(text, answer) {
  return { text, answer };
}

function def(term, answer) {
  return { term, answer };
}

const topicList = document.querySelector("#topicList");
const topicPanel = document.querySelector("#topicPanel");
const pdfGrid = document.querySelector("#pdfGrid");
const quizTabs = document.querySelector("#quizTabs");
const quizMeta = document.querySelector("#quizMeta");
const quizContent = document.querySelector("#quizContent");
const checkQuiz = document.querySelector("#checkQuiz");
const resetQuiz = document.querySelector("#resetQuiz");
const scoreBox = document.querySelector("#scoreBox");

let activeTopic = 0;
let activeQuiz = "easy";

function fileHref(file) {
  return encodeURI(file);
}

function renderTopics() {
  topicList.innerHTML = topics.map((topic, index) => `
    <button class="topic-btn ${index === activeTopic ? "active" : ""}" type="button" data-topic="${index}">
      <strong>${topic.title}</strong><br />
      <span class="muted">${topic.terms.slice(0, 3).join(" | ")}</span>
    </button>
  `).join("");

  const topic = topics[activeTopic];
  topicPanel.innerHTML = `
    <p class="eyebrow">Knowledge Point</p>
    <h2>${topic.title}</h2>
    <div class="knowledge-layout">
      <div class="box">
        <h3>Must-Know Points</h3>
        <ul>${topic.points.map((point) => `<li>${point}</li>`).join("")}</ul>
      </div>
      <div class="box gold">
        <h3>4+ Target</h3>
        <p>${topic.target}</p>
        <h3>Key Terms</h3>
        <div class="chips">${topic.terms.map((term) => `<span class="chip">${term}</span>`).join("")}</div>
      </div>
    </div>
    <div class="box blue" style="margin-top:16px;">
      <h3>Related Teacher PDFs</h3>
      <div class="pdf-grid">${topic.pdfs.map((file) => `<a class="pdf-link" href="${fileHref(file)}" target="_blank" rel="noopener noreferrer">${file}</a>`).join("")}</div>
    </div>
  `;
}

function renderPdfs() {
  pdfGrid.innerHTML = pdfs.map((file) => `<a class="pdf-link" href="${fileHref(file)}" target="_blank" rel="noopener noreferrer">${file}</a>`).join("");
}

function currentQuiz() {
  return quizzes.find((quiz) => quiz.id === activeQuiz) || quizzes[0];
}

function renderQuizTabs() {
  quizTabs.innerHTML = quizzes.map((quiz) => `
    <button class="${quiz.id === activeQuiz ? "active" : ""}" type="button" data-quiz="${quiz.id}">${quiz.title}</button>
  `).join("");
}

function renderQuiz() {
  const quiz = currentQuiz();
  renderQuizTabs();
  quizMeta.textContent = `${quiz.summary} This set has ${quiz.mc.length} multiple-choice questions, ${quiz.short.length} short-answer questions, and ${quiz.definitions.length} concept definitions.`;
  scoreBox.hidden = true;
  scoreBox.textContent = "";

  quizContent.innerHTML = `
    <div class="box">
      <h3>Multiple Choice</h3>
      ${quiz.mc.map((item, index) => `
        <div class="question" data-question="${index}">
          <span class="tag">Q${index + 1} | ${item.topic}</span>
          <p class="question-title">${item.text}</p>
          ${item.figure ? `<div class="figure">${item.figure}</div>` : ""}
          <div class="options">
            ${item.options.map((option, optionIndex) => `
              <label class="option">
                <input type="radio" name="${quiz.id}-${index}" value="${optionIndex}" />
                <span>${option}</span>
              </label>
            `).join("")}
          </div>
        </div>
      `).join("")}
    </div>
    <div class="two-col">
      <div class="box">
        <h3>Short Answer</h3>
        ${quiz.short.map((item, index) => `
          <div class="question">
            <span class="tag">SA${index + 1}</span>
            <p class="question-title">${item.text}</p>
            <textarea aria-label="Short answer ${index + 1}"></textarea>
            <details><summary>Teacher-style answer</summary><p>${item.answer}</p></details>
          </div>
        `).join("")}
      </div>
      <div class="box">
        <h3>Concept Definitions</h3>
        ${quiz.definitions.map((item, index) => `
          <div class="question">
            <span class="tag">Definition ${index + 1}</span>
            <p class="question-title">Define: ${item.term}</p>
            <textarea aria-label="Definition ${index + 1}"></textarea>
            <details><summary>Expected definition</summary><p>${item.answer}</p></details>
          </div>
        `).join("")}
      </div>
    </div>
  `;
}

topicList.addEventListener("click", (event) => {
  const button = event.target.closest("[data-topic]");
  if (!button) return;
  activeTopic = Number(button.dataset.topic);
  renderTopics();
});

quizTabs.addEventListener("click", (event) => {
  const button = event.target.closest("[data-quiz]");
  if (!button) return;
  activeQuiz = button.dataset.quiz;
  renderQuiz();
});

checkQuiz.addEventListener("click", () => {
  const quiz = currentQuiz();
  let score = 0;

  quiz.mc.forEach((item, index) => {
    const question = quizContent.querySelector(`[data-question="${index}"]`);
    const selected = quizContent.querySelector(`input[name="${quiz.id}-${index}"]:checked`);
    const selectedValue = selected ? Number(selected.value) : -1;

    if (selectedValue === item.answer) score += 1;

    question.querySelectorAll(".option").forEach((option, optionIndex) => {
      option.classList.remove("correct", "incorrect");
      if (optionIndex === item.answer) option.classList.add("correct");
      if (optionIndex === selectedValue && selectedValue !== item.answer) option.classList.add("incorrect");
    });
  });

  const percent = Math.round((score / quiz.mc.length) * 100);
  scoreBox.hidden = false;
  scoreBox.textContent = `Multiple-choice score: ${score} / ${quiz.mc.length} (${percent}%). Review the green correct answers, then compare your written answers with the teacher-style keys.`;
  scoreBox.scrollIntoView({ behavior: "smooth", block: "center" });
});

resetQuiz.addEventListener("click", renderQuiz);

renderTopics();
renderPdfs();
renderQuiz();
