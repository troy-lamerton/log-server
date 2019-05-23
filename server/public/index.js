window.onload = () => {
    // get elements
    const main = document.querySelector('main');
    const filterInput = document.getElementById('filterMessage');
    const flipOrder = document.getElementsByName('flipOrder')[0];

    const startReversed = localStorage.getItem('flipOrder') === 'true'
    if (startReversed) {
        flipOrder.checked = true;
        setDisplayOrder(startReversed);
    }
    
    // add event listeners
    filterInput.addEventListener('change', e => {
        const filter = e.currentTarget.value;
        filterLogs(filter)
    })
    flipOrder.addEventListener('change', e => {
        setDisplayOrder(e.currentTarget.checked);
    })

    function isReversed() {
        return flipOrder.checked;
    }
    
    function filterLogs(filter) {
        const logElements = main.children;
        for (const el of logElements) {
            el.style.display = el.innerText.toLowerCase().includes(filter.toLowerCase()) ? 'block' : 'none'
        }
    }
    
    function setDisplayOrder(reversed) {
        const className = 'reversed';
        if (reversed) {
            main.classList.add(className)
        } else {
            main.classList.remove(className)
        }
        localStorage.setItem('flipOrder', reversed.toString())
    }
    function flipDisplayOrder() {
        setDisplayOrder(!main.classList.contains(className))
    }
    
    async function query() {
        if (window.location.hash) {
            setTimeout(() => query(), 1000)
            return
        }
        const logIndex = main.children.length
        
        await fetch(`${window.location.pathname}/new?after=${logIndex}`)
        .then(res => res.json())
        .then(obj => {
            if (!obj.html) return;
            main.innerHTML += obj.html
            const filter = filterInput.value
            filterLogs(filter)
            if (!isReversed()) window.scrollTo(0, document.body.scrollHeight)
        }).catch(err => {/* ignored */})
        
        setTimeout(() => query(), 1000)
    }

    setTimeout(() => {
        query()
    }, 500)
}
