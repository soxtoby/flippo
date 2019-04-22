import './expand.less';
import * as React from "react";
import { useState } from "react";
import { colors } from "./colors";
import { FlipScope, Flipped } from "../lib/flip-react";

export function Expand(props: { path: string }) {
    let [expandedIndex, setExpandedIndex] = useState(0);

    let items = colors.slice(0, 5);

    return <FlipScope triggerData={expandedIndex}>
        {items.map((color, i) => <ColorCard key={color} color={color} expanded={expandedIndex == i} onClick={() => setExpandedIndex(i)} />)}
    </FlipScope>
}

function ColorCard({ color, expanded, onClick }: { color: string, expanded: boolean, onClick: () => void }) {
    return <Flipped id={color}>
        <div className={expanded ? 'colorCard is-colorCard-expanded' : 'colorCard'} onClick={onClick}>
            <div className="colorCard-header">
                <Flipped id={color + '-swatch'}>
                    <div className="colorCard-swatch" style={{ color }}></div>
                </Flipped>
                <Flipped id={color + '-name'}>
                    <div className="colorCard-name">{color}</div>
                </Flipped>
            </div>
            {expanded && <>
                <div className="colorCard-detail"></div>
                <div className="colorCard-detail"></div>
                <div className="colorCard-detail"></div>
            </>}
        </div>
    </Flipped>;
}