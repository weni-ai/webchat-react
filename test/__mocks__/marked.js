const marked = {
  lexer: jest.fn(() => []),
  parse: jest.fn((text) => text),
  use: jest.fn(),
  parseInline: jest.fn((text) => text),
};

module.exports = {
  marked,
  lexer: marked.lexer,
  parse: marked.parse,
};
