/* 所有主题共用的牌的手势：
   点一下（几乎没动就松手） → onTap，用来换一件同类的；
   按住拖动 → 牌跟着手指走，拖进目标圈松手 → onDrop，用来选中；没进圈就弹回原处。
   牌在拖的时候会加上 .dragging（主题里用它关掉过渡、抬高层级）。 */

const MOVE = 10;

export function draggable(el, { enabled = () => true, target, onTap, onStart, onHover, onDrop, onCancel } = {}) {
  let s = null;
  el.style.touchAction = 'none';

  const inTarget = () => {
    const t = target && target();
    if (!t) return false;
    const a = el.getBoundingClientRect(), b = t.getBoundingClientRect();
    const dx = a.left + a.width / 2 - (b.left + b.width / 2);
    const dy = a.top + a.height / 2 - (b.top + b.height / 2);
    return Math.hypot(dx, dy) < b.width * 0.62;
  };

  el.addEventListener('pointerdown', e => {
    if (s || !enabled() || (e.pointerType === 'mouse' && e.button !== 0)) return;
    s = { id: e.pointerId, x: e.clientX, y: e.clientY, dx: 0, dy: 0, drag: false, hot: false };
    try { el.setPointerCapture(e.pointerId); } catch (err) {}
  });

  el.addEventListener('pointermove', e => {
    if (!s || e.pointerId !== s.id) return;
    s.dx = e.clientX - s.x;
    s.dy = e.clientY - s.y;
    if (!s.drag && Math.hypot(s.dx, s.dy) > MOVE) {
      s.drag = true;
      el.classList.add('dragging');
      if (onStart) onStart();
    }
    if (!s.drag) return;
    const tilt = Math.max(-12, Math.min(12, s.dx * 0.05));
    el.style.transform = `translate(${s.dx}px,${s.dy}px) rotate(${tilt}deg) scale(1.06)`;
    const hot = inTarget();
    if (hot !== s.hot) {
      s.hot = hot;
      if (onHover) onHover(hot);
    }
  });

  const end = e => {
    if (!s || e.pointerId !== s.id) return;
    const was = s;
    s = null;
    try { el.releasePointerCapture(e.pointerId); } catch (err) {}
    if (!was.drag) {
      if (e.type === 'pointerup' && enabled() && onTap) onTap();
      return;
    }
    const hit = e.type === 'pointerup' && enabled() && inTarget();
    if (was.hot && onHover) onHover(false);
    el.classList.remove('dragging');
    if (hit) {
      onDrop();
      return;
    }
    el.style.transform = '';
    if (onCancel) onCancel();
  };
  el.addEventListener('pointerup', end);
  el.addEventListener('pointercancel', end);

  /* 键盘按回车 / 空格也能换一件 */
  el.addEventListener('click', e => {
    if (e.detail === 0 && enabled() && onTap) onTap();
  });
}

/* 松手后把牌吸进圈的正中间 */
export function snapInto(el, target, scale = 0.88) {
  const a = el.getBoundingClientRect(), b = target.getBoundingClientRect();
  const m = /translate\(([-\d.]+)px,\s*([-\d.]+)px\)/.exec(el.style.transform);
  const x = (m ? +m[1] : 0) + (b.left + b.width / 2 - (a.left + a.width / 2));
  const y = (m ? +m[2] : 0) + (b.top + b.height / 2 - (a.top + a.height / 2));
  el.style.transition = 'transform .32s cubic-bezier(.3,1.3,.5,1)';
  el.style.transform = `translate(${x}px,${y}px) scale(${scale})`;
}
