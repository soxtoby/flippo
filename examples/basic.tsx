import { Flip, FlipScope } from "flippo-react";
import { ReactNode, useState } from "react";
import "./basic.less";

export function Basic(props: { path: string }) {
    return <FlipScope enter={false} exit={false}>
        <FlippingDemo />
        <VisibilityDemo />
        <SharedIdDemo />
    </FlipScope>;
}

function FlippingDemo() {
    let [showLarge, setShowLarge] = useState(false);

    return <>
        <button onClick={() => setShowLarge(large => !large)}>Toggle size</button>
        <Flip scale>
            <div className={showLarge ? 'large' : 'small'}></div>
        </Flip>
    </>
}

function VisibilityDemo() {
    let [visible, setVisible] = useState(true);

    return <>
        <button onClick={() => setVisible(v => !v)}>Toggle visibility</button>
        {visible &&
            <Flip>
                <div className="small"></div>
            </Flip>
        }
    </>
}

function SharedIdDemo() {
    let [selectedIndex, setSelectedIndex] = useState(0);

    return <div className="tabList">
        <Tab isSelected={selectedIndex == 0} onClick={() => setSelectedIndex(0)}>One</Tab>
        <Tab isSelected={selectedIndex == 1} onClick={() => setSelectedIndex(1)}>Two</Tab>
        <Tab isSelected={selectedIndex == 2} onClick={() => setSelectedIndex(2)}>Threeeeeeee</Tab>
    </div>
}

function Tab({ isSelected, onClick, children }: { isSelected: boolean; onClick(): void; children: ReactNode; }) {
    return <div className="tab">
        <button onClick={onClick}>{children}</button>
        {isSelected &&
            <Flip scale="x" position="x" id="highlight">
                <div className="tab-highlight" />
            </Flip>
        }
    </div>
}