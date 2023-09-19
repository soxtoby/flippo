import { Flip, FlipScope } from "flippo-react";
import * as React from "react";
import "./basic.less";

export function Basic(props: { path: string }) {
    return <>
        <FlippingDemo />
        <VisibilityDemo />
        <SharedIdDemo />
    </>;
}

// Should match example in readme
function FlippingDemo() {
    let [showLarge, setShowLarge] = React.useState(false);

    return <FlipScope triggerData={showLarge}>
        <button onClick={() => setShowLarge(large => !large)}>Toggle size</button>
        {showLarge
            ? <Flip id="box"><div className="large"></div></Flip>
            : <Flip id="box"><div className="small"></div></Flip>
        }
    </FlipScope>;
}

function VisibilityDemo() {
    let [visible, setVisible] = React.useState(true);

    return <FlipScope triggerData={visible}>
        <button onClick={() => setVisible(v => !v)}>Toggle visibility</button>
        {visible &&
            <Flip id="visibility">
                <div className="small"></div>
            </Flip>
        }
    </FlipScope>
}

function SharedIdDemo() {
    let [selectedIndex, setSelectedIndex] = React.useState(0);

    return <FlipScope triggerData={selectedIndex}>
        <div className="tabList">
            <Tab isSelected={selectedIndex == 0} onClick={() => setSelectedIndex(0)}>One</Tab>
            <Tab isSelected={selectedIndex == 1} onClick={() => setSelectedIndex(1)}>Two</Tab>
            <Tab isSelected={selectedIndex == 2} onClick={() => setSelectedIndex(2)}>Threeeeeeee</Tab>
        </div>
    </FlipScope>
}

function Tab({ isSelected, onClick, children }: { isSelected: boolean; onClick(): void; children: React.ReactNode; }) {
    return <div className="tab">
        <button onClick={onClick}>{children}</button>
        {isSelected &&
            <Flip id="highlight">
                <div className="tab-highlight" />
            </Flip>
        }
    </div>
}