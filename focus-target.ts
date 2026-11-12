import {useEffect} from 'react';
import {useSearchParams} from 'react-router-dom';

/* Opens a page at the exact offer or order an alert points to: scrolls to the row with data-focus-id=<?focus=id> once it has loaded and flashes it. */
export function useFocusTarget(): void {
  const [params] = useSearchParams();
  const id = params.get('focus');
  useEffect(() => {
    if (!id) return;
    const started = Date.now();
    const find = (): boolean => {
      const el = document.querySelector(`[data-focus-id="${id.replace(/"/g, '')}"]`);
      if (!el) return false;
      for (let p = el.parentElement; p; p = p.parentElement) if (p instanceof HTMLDetailsElement && !p.open) p.open = true;
      el.scrollIntoView({block: 'center', behavior: 'auto'});
      el.classList.add('focus-flash');
      return true;
    };
    if (find()) return;
    const timer = window.setInterval(() => {if (find() || Date.now() - started > 10000) window.clearInterval(timer);}, 300);
    return () => window.clearInterval(timer);
  }, [id]);
}
