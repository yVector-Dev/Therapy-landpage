// Obras indicadas na seção "Obras e leituras" de cada artigo, por idioma.
// Sem "autor", usa-se o nome da própria personalidade na busca da loja.
const L = (pt, en, es, autor) => ({ titulo: { pt, en, es }, ...(autor ? { autor } : {}) });
const PLATAO = { pt: 'Platão', en: 'Plato', es: 'Platón' };

export default {
  'lao-tse': [L('Tao Te Ching', 'Tao Te Ching', 'Tao Te Ching')],
  buda: [L('Dhammapada', 'The Dhammapada', 'Dhammapada')],
  confucio: [L('Os Analectos', 'The Analects', 'Analectas')],
  socrates: [
    L('Apologia de Sócrates', 'Apology of Socrates', 'Apología de Sócrates', PLATAO),
    L('Fédon', 'Phaedo', 'Fedón', PLATAO),
    L('Ditos e feitos memoráveis de Sócrates', 'Memorabilia', 'Recuerdos de Sócrates', { pt: 'Xenofonte', en: 'Xenophon', es: 'Jenofonte' }),
  ],
  platao: [
    L('A República', 'The Republic', 'La República'),
    L('O Banquete', 'The Symposium', 'El banquete'),
    L('Fédon', 'Phaedo', 'Fedón'),
  ],
  aristoteles: [
    L('Ética a Nicômaco', 'Nicomachean Ethics', 'Ética a Nicómaco'),
    L('Política', 'Politics', 'Política'),
    L('Poética', 'Poetics', 'Poética'),
  ],
  seneca: [
    L('Sobre a Brevidade da Vida', 'On the Shortness of Life', 'Sobre la brevedad de la vida'),
    L('Cartas a Lucílio', 'Letters from a Stoic', 'Cartas a Lucilio'),
  ],
  'marco-aurelio': [L('Meditações', 'Meditations', 'Meditaciones')],
  'santo-agostinho': [
    L('Confissões', 'Confessions', 'Confesiones'),
    L('A Cidade de Deus', 'The City of God', 'La ciudad de Dios'),
  ],
  'tomas-de-aquino': [L('Suma Teológica', 'Summa Theologica', 'Suma teológica')],
  'leonardo-da-vinci': [
    L('Cadernos de Leonardo da Vinci', 'The Notebooks of Leonardo da Vinci', 'Cuadernos de notas de Leonardo da Vinci'),
    L('Leonardo da Vinci', 'Leonardo da Vinci', 'Leonardo da Vinci', { pt: 'Walter Isaacson', en: 'Walter Isaacson', es: 'Walter Isaacson' }),
  ],
  shakespeare: [
    L('Hamlet', 'Hamlet', 'Hamlet'),
    L('Romeu e Julieta', 'Romeo and Juliet', 'Romeo y Julieta'),
    L('Macbeth', 'Macbeth', 'Macbeth'),
    L('Sonetos', 'The Sonnets', 'Sonetos'),
  ],
  'galileu-galilei': [
    L('Diálogo sobre os Dois Máximos Sistemas do Mundo', 'Dialogue Concerning the Two Chief World Systems', 'Diálogo sobre los dos máximos sistemas del mundo'),
    L('O Mensageiro Sideral', 'Sidereus Nuncius, or The Sidereal Messenger', 'El mensaje y el mensajero sideral'),
  ],
  descartes: [
    L('Discurso do Método', 'Discourse on the Method', 'Discurso del método'),
    L('Meditações Metafísicas', 'Meditations on First Philosophy', 'Meditaciones metafísicas'),
  ],
  'isaac-newton': [L('Principia: Princípios Matemáticos de Filosofia Natural', 'The Principia: Mathematical Principles of Natural Philosophy', 'Principios matemáticos de la filosofía natural')],
  kant: [
    L('Crítica da Razão Pura', 'Critique of Pure Reason', 'Crítica de la razón pura'),
    L('Fundamentação da Metafísica dos Costumes', 'Groundwork of the Metaphysics of Morals', 'Fundamentación de la metafísica de las costumbres'),
    L('À Paz Perpétua', 'Perpetual Peace', 'Sobre la paz perpetua'),
  ],
  'charles-darwin': [
    L('A Origem das Espécies', 'On the Origin of Species', 'El origen de las especies'),
    L('A Viagem do Beagle', 'The Voyage of the Beagle', 'El viaje del Beagle'),
  ],
  'machado-de-assis': [
    L('Memórias Póstumas de Brás Cubas', 'The Posthumous Memoirs of Brás Cubas', 'Memorias póstumas de Blas Cubas'),
    L('Dom Casmurro', 'Dom Casmurro', 'Dom Casmurro'),
    L('O Alienista', 'The Alienist', 'El alienista'),
  ],
  nietzsche: [
    L('Assim Falou Zaratustra', 'Thus Spoke Zarathustra', 'Así habló Zaratustra'),
    L('Além do Bem e do Mal', 'Beyond Good and Evil', 'Más allá del bien y del mal'),
    L('A Gaia Ciência', 'The Gay Science', 'La gaya ciencia'),
  ],
  'marie-curie': [
    L('Pierre Curie', 'Pierre Curie', 'Pierre Curie'),
    L('Madame Curie', 'Madame Curie: A Biography', 'Madame Curie', { pt: 'Ève Curie', en: 'Ève Curie', es: 'Ève Curie' }),
  ],
  gandhi: [
    L('Autobiografia: minha vida e minhas experiências com a verdade', 'An Autobiography: The Story of My Experiments with Truth', 'Autobiografía: historia de mis experimentos con la verdad'),
  ],
  'albert-einstein': [
    L('Como Vejo o Mundo', 'The World As I See It', 'Mi visión del mundo'),
    L('A Teoria da Relatividade Especial e Geral', 'Relativity: The Special and the General Theory', 'Sobre la teoría de la relatividad especial y general'),
  ],
  'hannah-arendt': [
    L('Origens do Totalitarismo', 'The Origins of Totalitarianism', 'Los orígenes del totalitarismo'),
    L('Eichmann em Jerusalém', 'Eichmann in Jerusalem', 'Eichmann en Jerusalén'),
    L('A Condição Humana', 'The Human Condition', 'La condición humana'),
  ],
  'simone-de-beauvoir': [
    L('O Segundo Sexo', 'The Second Sex', 'El segundo sexo'),
    L('Memórias de uma Moça Bem-Comportada', 'Memoirs of a Dutiful Daughter', 'Memorias de una joven formal'),
  ],
  'nelson-mandela': [L('Longa Caminhada até a Liberdade', 'Long Walk to Freedom', 'El largo camino hacia la libertad')],
  'paulo-freire': [
    L('Pedagogia do Oprimido', 'Pedagogy of the Oppressed', 'Pedagogía del oprimido'),
    L('Pedagogia da Autonomia', 'Pedagogy of Freedom', 'Pedagogía de la autonomía'),
  ],
  'martin-luther-king': [
    L('Um Apelo à Consciência: os melhores discursos de Martin Luther King', 'Why We Can’t Wait', 'Un sueño de igualdad'),
    L('A Força de Amar', 'Strength to Love', 'La fuerza de amar'),
  ],
};
