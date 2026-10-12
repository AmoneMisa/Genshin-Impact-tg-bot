/** Delegation keeps links created or replaced by live screens clickable. */
export function bindFeatureLinks(root, {openFeature,haptic = () => {}}) {
  const click=event=>{
    const button=event.target.closest?.('[data-open-feature]');
    if(!button||button.disabled||button.closest('[inert]'))return;
    haptic('light');openFeature(button.dataset.openFeature);
  };
  root.addEventListener('click',click);
  return ()=>root.removeEventListener('click',click);
}
