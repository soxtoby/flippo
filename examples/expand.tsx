import { Flip, FlipScope } from "flippo-react";
import * as React from "react";
import { useState } from "react";
import { colors } from "./colors";
import "./expand.less";

export function Expand(props: { path: string }) {
    let [expandedIndex, setExpandedIndex] = useState(0);

    let items = colors.slice(0, 5);

    return <FlipScope triggerData={expandedIndex}>
        {items.map((color, i) => <ColorCard key={color} color={color} expanded={expandedIndex == i} onClick={() => setExpandedIndex(i)} />)}
    </FlipScope>
}

function ColorCard({ color, expanded, onClick }: { color: string, expanded: boolean, onClick: () => void }) {
    return <Flip id={color}>
        <div className={expanded ? 'colorCard is-colorCard-expanded' : 'colorCard'} onClick={onClick}>
            <div className="colorCard-header">
                <Flip id={color + '-swatch'}>
                    <div className="colorCard-swatch" style={{ color }}></div>
                </Flip>
                <Flip id={color + '-name'}>
                    <div className="colorCard-name">{color}</div>
                </Flip>
            </div>
            {expanded && <>
                <Flip><div className="colorCard-detail"></div></Flip>
                <Flip><div className="colorCard-detail"></div></Flip>
                <Flip><div className="colorCard-detail"></div></Flip>
            </>}
        </div>
    </Flip>;
}