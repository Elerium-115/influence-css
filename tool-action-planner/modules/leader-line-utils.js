/**
 * Leader Line utils
 * https://anseki.github.io/leader-line/
 */
const leaderLineOptions = {
    size: 1,
    startSocket: 'left',
    endSocket: 'left',
    startPlug: 'behind',
    endPlug: 'arrow1',
    startPlugSize: 2,
    endPlugSize: 2,
    startPlugColor: 'var(--color-leaderline-start)',
    endPlugColor: 'var(--color-leaderline-end)',
    startSocketGravity: 25,
    endSocketGravity: 25,
    gradient: true,
    dash: {len: 8, gap: 3, animation: true},
};

function leaderLineConnectElements(el1, el2) {
    const line = new LeaderLine(el1, el2);
    line.setOptions(leaderLineOptions);
    // Move the newly created SVG into the parent of "el1" (i.e. ".action-details")
    const elLine = document.querySelector('body > svg.leader-line');
    el1.parentElement.appendChild(elLine);
}

export {leaderLineConnectElements};
