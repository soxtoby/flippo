import { Flip, FlipScope } from "flippo-react";
import * as React from "react";
import { memo, useState } from "react";
import { colors } from "./colors";
import "./expand.less";

export function Expand(props: { path: string }) {
    let [singleExpansion, setSingleExpansion] = useState(true);
    let [expandedColor, setExpandedColor] = useState(colors[0]);

    let items = colors.slice(0, 5);

    return <div>
        <label>
            <input type="checkbox" checked={singleExpansion} onChange={e => setSingleExpansion(e.target.checked)} /> Single expansion
        </label>
        <FlipScope>
            {items.map(color =>
                <ColorCard
                    key={color}
                    color={color}
                    singleExpansion={singleExpansion}
                    isExpandedColor={expandedColor == color}
                    setExpandedColor={setExpandedColor}
                />
            )}
        </FlipScope>
    </div>
}

interface ColorCardProps {
    color: string;
    singleExpansion: boolean;
    isExpandedColor: boolean;
    setExpandedColor: (color: string) => void;
}

const ColorCard = memo(function ColorCard({ color, singleExpansion, isExpandedColor, setExpandedColor }: ColorCardProps) {
    let [selfExpanded, setSelfExpanded] = useState(false);

    let expanded = singleExpansion
        ? isExpandedColor
        : selfExpanded;

    return <Flip id={color}>
        <div className={expanded ? 'colorCard is-colorCard-expanded' : 'colorCard'} onClick={expandCollapse}>
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

    function expandCollapse() {
        if (singleExpansion)
            setExpandedColor(color);
        else
            setSelfExpanded(e => !e);
    }
});