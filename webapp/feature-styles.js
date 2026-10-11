let loading;
export function ensureFeatureStyles() {
  const url = document.querySelector('meta[name="game-feature-styles"]')?.content;
  if (!url) return Promise.resolve(); // Direct static development pages already include all styles.
  if (!loading) {
    loading = new Promise((resolve,reject) => {
      const link = document.createElement('link');
      link.rel = 'stylesheet';link.href = url;
      let timeout;
      const fail = () => {
        clearTimeout(timeout);link.remove();loading = null;
        reject(new Error('Не удалось загрузить оформление. Попробуйте открыть окно ещё раз.'));
      };
      link.onload = () => {clearTimeout(timeout);resolve();};
      link.onerror = fail;
      timeout = setTimeout(fail,20000);
      document.head.append(link);
    });
  }
  return loading;
}
