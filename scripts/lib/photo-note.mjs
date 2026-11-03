// 自分で撮った写真の加工の注記（venues.json の image.edit = {ja, en}。なければ注記なし）
export const editNote = (im, lang) => {
  const t = im?.edit?.[lang];
  return t ? (lang === 'ja' ? `（${t}）` : ` (${t})`) : '';
};
