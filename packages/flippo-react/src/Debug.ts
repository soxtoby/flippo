export function enableDebugging(enable = true) {
    if (process.env.NODE_ENV !== 'production') {
        let stylesheet = document.getElementById('flippo-debugging');

        if (enable) {
            if (!stylesheet) {
                stylesheet = document.createElement('style');
                stylesheet.id = 'flippo-debugging';
                document.head.appendChild(stylesheet);
            }
            stylesheet.innerHTML = `
[data-flipid] {
    outline: 1px solid red;
    position: relative;
    &:hover::before {
        content: attr(data-flipid);
        color: white;
        background: red;
        position: absolute;
        top: 0;
        right: 0;
        font-size: small;
    }
}
/*# sourceURL=flippo-debugging.css */`;
        } else {
            stylesheet?.remove();
        }
    }
}