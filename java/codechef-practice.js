(() => {
  const requested = new URLSearchParams(location.search).get('lesson');
  const selected = ['1.3', '1.4', '1.4-extra'].includes(requested) ? requested : '1.3';
  document.querySelectorAll('[data-practice-lesson]').forEach(section => {
    section.hidden = section.dataset.practiceLesson !== selected;
  });
})();
