// Código de transferência: o progresso inteiro virado num texto,
// para copiar num aparelho e colar em outro (ou guardar como cópia de segurança).

const TAG = 'AMDA1';

// soma de verificação simples (FNV-1a) para perceber código cortado ou digitado errado
function check(text) {
  let h = 0x811c9dc5;
  for (let i = 0; i < text.length; i++) {
    h ^= text.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return (h >>> 0).toString(36);
}

export function makeCode(save) {
  const bytes = new TextEncoder().encode(JSON.stringify(save));
  let bin = '';
  for (const b of bytes) bin += String.fromCharCode(b);
  const body = btoa(bin).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
  return `${TAG}.${body}.${check(body)}`;
}

// devolve o save guardado no código, ou null se o código não serve
export function readCode(code) {
  const parts = String(code || '').replace(/\s+/g, '').split('.');
  if (parts.length !== 3 || parts[0] !== TAG || !parts[1] || check(parts[1]) !== parts[2]) return null;
  try {
    const bin = atob(parts[1].replace(/-/g, '+').replace(/_/g, '/'));
    const save = JSON.parse(new TextDecoder().decode(Uint8Array.from(bin, (c) => c.charCodeAt(0))));
    return save && typeof save === 'object' && !Array.isArray(save) ? save : null;
  } catch {
    return null;
  }
}
