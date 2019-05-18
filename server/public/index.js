window.onload = () => {
    document.getElementById('filterMessage').addEventListener('change', e => {
        const filter = e.currentTarget.value;
        filterLogs(filter)
    })
}

function filterLogs(filter) {
    const logElements = document.getElementsByTagName('main')[0].children;
    for (const el of logElements) {
        el.style.display = el.innerText.toLowerCase().includes(filter.toLowerCase()) ? 'block' : 'none'
    }
}

async function query() {
    if (window.location.hash) return
    const logIndex = document.querySelector('main').children.length
    
    await fetch(`${window.location.pathname}/new?after=${logIndex}`)
        .then(res => res.json())
        .then(obj => {
            if (!obj.html) return;
            document.getElementsByTagName('main')[0].innerHTML += obj.html
            const filter = document.getElementById('filterMessage').value
            filterLogs(filter)
            window.scrollTo(0, document.body.scrollHeight)
        }).catch(lul => {/* ignored */})
    
    setTimeout(() => query(), 1000)
}

if (!window.location.hash) {
    setTimeout(() => {
        query()
    }, 500)
}