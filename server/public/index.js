window.onload = () => {
    setTimeout(() => window.scrollTo(0, document.body.scrollHeight), 5)
    document.documentElement.scrollTop = document.documentElement.scrollHeight
}
async function query() {
    if (window.location.hash) return
    const logIndex = document.querySelector('main').children.length
    
    await fetch(`${window.location.pathname}/new?after=${logIndex}`)
        .then(res => res.json())
        .then(obj => {
            if (!obj.html) return;
            document.getElementsByTagName('main')[0].innerHTML += obj.html
            window.scrollTo(0, document.body.scrollHeight)
        }).catch(lul => {/* ignored */})
    
    setTimeout(() => query(), 1000)
}

if (!window.location.hash) {
    setTimeout(() => {
        query()
    }, 500)
}