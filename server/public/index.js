window.onload = () => {
    // get elements
    const $ = window.jQuery;
    const main = document.querySelector('main');
    const filterInput = document.getElementById('filterMessage');
    const flipOrder = document.getElementsByName('flipOrder')[0];

    $('main').mousewheel(function(e, delta) {

        if (main.classList.contains('commits') 
        || main.classList.contains('players')) {

            this.scrollLeft -= (delta * 40);
            e.preventDefault();
        }
    });

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
    
    async function query() {
        const interval = 1500
        if (window.location.hash) {
            setTimeout(() => query(), interval)
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
        
        setTimeout(() => query(), interval)
    }

    setTimeout(() => {
        // start auto refreshing
        query()
    }, 1000)
}
