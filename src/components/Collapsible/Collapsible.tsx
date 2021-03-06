import React, {
  createContext,
  createRef,
  TransitionEvent,
  Component,
  ComponentClass,
} from 'react';

import {classNames} from '../../utilities/css';

import styles from './Collapsible.scss';

interface Transition {
  /** Assign a transition duration to the collapsible animation. */
  duration?: string;
  /** Assign a transition timing function to the collapsible animation */
  timingFunction?: string;
}

export interface CollapsibleProps {
  /** Assign a unique ID to the collapsible. For accessibility, pass this ID as the value of the triggering component’s aria-controls prop. */
  id: string;
  /** Option to show collapsible content when printing */
  expandOnPrint?: boolean;
  /** Toggle whether the collapsible is expanded or not. */
  open: boolean;
  /** Assign transition properties to the collapsible */
  transition?: Transition;
  /** The content to display inside the collapsible. */
  children?: React.ReactNode;
}

type AnimationState =
  | 'idle'
  | 'measuring'
  | 'closingStart'
  | 'closing'
  | 'openingStart'
  | 'opening';

interface State {
  height?: number | null;
  animationState: AnimationState;
  open: boolean;
}

const ParentCollapsibleExpandingContext = createContext(false);

class CollapsibleInner extends Component<CollapsibleProps, State> {
  static contextType = ParentCollapsibleExpandingContext;

  static getDerivedStateFromProps(
    {open: willOpen}: CollapsibleProps,
    {open, animationState: prevAnimationState}: State,
  ) {
    let nextAnimationState = prevAnimationState;
    if (open !== willOpen) {
      nextAnimationState = 'measuring';
    }

    return {
      animationState: nextAnimationState,
      open: willOpen,
    };
  }

  context!: React.ContextType<typeof ParentCollapsibleExpandingContext>;

  state: State = {
    height: null,
    animationState: 'idle',
    // eslint-disable-next-line react/no-unused-state
    open: this.props.open,
  };

  private node = createRef<HTMLDivElement>();
  private heightNode = createRef<HTMLDivElement>();

  componentDidUpdate({open: wasOpen}: CollapsibleProps) {
    const {animationState} = this.state;
    const parentCollapsibleExpanding = this.context;

    if (parentCollapsibleExpanding && animationState !== 'idle') {
      // eslint-disable-next-line react/no-did-update-set-state
      this.setState({
        animationState: 'idle',
      });

      return;
    }

    requestAnimationFrame(() => {
      const heightNode = this.heightNode.current;
      switch (animationState) {
        case 'idle':
          break;
        case 'measuring':
          this.setState({
            animationState: wasOpen ? 'closingStart' : 'openingStart',
            height: wasOpen && heightNode ? heightNode.scrollHeight : 0,
          });
          break;
        case 'closingStart':
          this.setState({
            animationState: 'closing',
            height: 0,
          });
          break;
        case 'openingStart':
          this.setState({
            animationState: 'opening',
            height: heightNode ? heightNode.scrollHeight : 0,
          });
      }
    });
  }

  render() {
    const {id, expandOnPrint, open, children, transition} = this.props;
    const {animationState, height} = this.state;
    const parentCollapsibleExpanding = this.context;

    const animating = animationState !== 'idle';

    const wrapperClassName = classNames(
      styles.Collapsible,
      open && styles.open,
      animating && styles.animating,
      !animating && open && styles.fullyOpen,
      expandOnPrint && styles.expandOnPrint,
    );

    const displayHeight = collapsibleHeight(open, animationState, height);

    const content = animating || open || expandOnPrint ? children : null;

    const transitionProperties = transition
      ? {
          transitionDuration: `${transition.duration}`,
          transitionTimingFunction: `${transition.timingFunction}`,
        }
      : null;

    return (
      <ParentCollapsibleExpandingContext.Provider
        value={
          parentCollapsibleExpanding || (open && animationState !== 'idle')
        }
      >
        <div
          id={id}
          aria-hidden={!open}
          style={{
            maxHeight: `${displayHeight}`,
            ...transitionProperties,
          }}
          className={wrapperClassName}
          ref={this.node}
          onTransitionEnd={this.handleTransitionEnd}
        >
          <div ref={this.heightNode}>{content}</div>
        </div>
      </ParentCollapsibleExpandingContext.Provider>
    );
  }

  private handleTransitionEnd = (event: TransitionEvent) => {
    const {target} = event;
    if (target === this.node.current) {
      this.setState({animationState: 'idle', height: null});
    }
  };
}

function collapsibleHeight(
  open: boolean,
  animationState: AnimationState,
  height?: number | null,
) {
  if (animationState === 'idle' && open) {
    return open ? 'none' : undefined;
  }

  if (animationState === 'measuring') {
    return open ? undefined : 'none';
  }

  return `${height || 0}px`;
}

export const Collapsible = CollapsibleInner as ComponentClass<
  CollapsibleProps
> &
  typeof CollapsibleInner;
