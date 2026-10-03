// Apply the saved preference before styles or React paint the page.
;(function () {
  var theme = 'light'
  try {
    if (localStorage.getItem('fracture-atlas-theme') === 'dark') theme = 'dark'
  } catch {
    // Storage can be unavailable in private or restricted browsing contexts.
  }
  document.documentElement.dataset.theme = theme
  document.documentElement.style.colorScheme = theme
})()
