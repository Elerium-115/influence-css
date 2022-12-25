/**
 * Leader Line utils
 * https://anseki.github.io/leader-line/
 */
const leaderLineOptions = {
    size: 1,
    startSocket: 'left',
    endSocket: 'left',
    startPlug: 'disc',
    endPlug: 'arrow1',
    startPlugSize: 2,
    endPlugSize: 1.75,
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
    el1.parentElement.append(elLine);
}

if (typeof LeaderLine === 'function') {
    /**
     * Disable the automatic repositioning of leader lines on window resize,
     * b/c it would trigger an error due to the original SVGs not being a direct
     * child of "body" anymore (they are moved during "leaderLineConnectElements").
     */
    LeaderLine.positionByWindowResize = false;
}

export {leaderLineConnectElements};
