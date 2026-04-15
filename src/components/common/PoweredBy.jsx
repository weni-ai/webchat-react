import React from 'react';
import './PoweredBy.scss';

export function PoweredBy() {
  return (
    <a
      href="https://vtex.com/en-us/products/agentic-cx"
      className="weni-poweredby"
      target="_blank"
      rel="noopener noreferrer"
    >
      <p className="weni-poweredby__text">Powered by VTEX CX</p>
    </a>
  );
}

export default PoweredBy;
