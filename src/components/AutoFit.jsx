import React, { useRef, useLayoutEffect, useEffect, useCallback } from 'react';

// Caja que ajusta sola el tamaño de letra de su contenido para que quepa sin
// desbordarse ni requerir scroll. Se usa en el modo proyector, donde la
// pregunta y las respuestas deben verse completas en una sola pantalla.
//
// La caja debe tener un tamaño dado desde afuera (por ejemplo, un hijo flex con
// `flex: 1 1 …` y `minHeight: 0`): el contenido se encoge a ella, no al revés.
// `maxVw` es la letra máxima como fracción del ancho de la ventana.
export const AutoFit = ({ children, className, style, maxVw = 0.04, minPx = 12 }) => {
  const outerRef = useRef(null);
  const innerRef = useRef(null);

  const fit = useCallback(() => {
    const outer = outerRef.current;
    const inner = innerRef.current;
    if (!outer || !inner) return;
    const cs = getComputedStyle(outer);
    const availH = outer.clientHeight - parseFloat(cs.paddingTop) - parseFloat(cs.paddingBottom);
    const availW = outer.clientWidth - parseFloat(cs.paddingLeft) - parseFloat(cs.paddingRight);
    if (availH <= 0 || availW <= 0) return;

    let lo = minPx;
    let hi = Math.max(minPx, window.innerWidth * maxVw);
    for (let i = 0; i < 11; i++) {
      const mid = (lo + hi) / 2;
      outer.style.fontSize = `${mid}px`;
      if (inner.offsetHeight <= availH && inner.scrollWidth <= availW + 1) lo = mid;
      else hi = mid;
    }
    outer.style.fontSize = `${lo}px`;
  }, [maxVw, minPx]);

  // Reajusta con cada cambio de contenido…
  useLayoutEffect(fit);

  // …y cuando cambia el tamaño de la caja o terminan de cargar las tipografías.
  useEffect(() => {
    const outer = outerRef.current;
    if (!outer) return undefined;
    let raf = 0;
    const again = () => { cancelAnimationFrame(raf); raf = requestAnimationFrame(fit); };
    const ro = typeof ResizeObserver !== 'undefined' ? new ResizeObserver(again) : null;
    ro?.observe(outer);
    window.addEventListener('resize', again);
    document.fonts?.ready.then(again);
    return () => {
      cancelAnimationFrame(raf);
      ro?.disconnect();
      window.removeEventListener('resize', again);
    };
  }, [fit]);

  return (
    <div
      ref={outerRef}
      className={className}
      style={{ ...style, display: 'flex', alignItems: 'center', overflow: 'hidden' }}
    >
      <div ref={innerRef} style={{ width: '100%' }}>{children}</div>
    </div>
  );
};

// Con `enabled` ajusta el tamaño de letra; sin él, es una caja común.
export const MaybeFit = ({ enabled, children, className, style, ...rest }) =>
  enabled
    ? <AutoFit className={className} style={style} {...rest}>{children}</AutoFit>
    : <div className={className} style={style}>{children}</div>;

export default AutoFit;
