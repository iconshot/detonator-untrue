import { Component, Node } from "untrue";

class DetonatorUntrue {
  constructor() {
    this.store = null;

    const self = this;

    this.Provider = class DetonatorProvider extends Component {
      constructor(props) {
        super(props);

        const { store, persistor = null } = this.props;

        // no persistor = loaded

        this.state = { loaded: persistor === null };

        self.store = store;

        // init persistor on mount

        this.on("mount", async () => {
          if (persistor !== null) {
            await persistor.init();

            this.updateState({ loaded: true });
          }
        });
      }

      render() {
        const { loadingNode, children } = this.props;

        const { loaded } = this.state;

        return !loaded ? loadingNode : children;
      }
    };
  }

  wrapSelector(Child, ...selectors) {
    const self = this;

    // consistent with Wrapper.wrapContext

    return class DetonatorSelector extends Component {
      constructor(props) {
        super(props);

        this.result = {};

        this.on("mount", this.handleMountStore);
        this.on("unmount", this.handleUnmountStore);

        this.compareListener = () => {
          this.compare();
        };
      }

      handleMountStore = () => {
        self.store.on("update", this.compareListener);
      };

      handleUnmountStore = () => {
        self.store.off("update", this.compareListener);
      };

      compare() {
        try {
          const result = this.select();

          const updated = !this.compareDeep(result, this.result);

          if (updated) {
            this.update();
          }
        } catch (error) {}
      }

      select() {
        const state = self.store.getState();

        return selectors.reduce((result, selector) => {
          const newProps = { ...this.props, ...result };

          const newResult = selector(state, newProps);

          return { ...result, ...newResult };
        }, {});
      }

      populate() {
        try {
          this.result = this.select();
        } catch (error) {}
      }

      render() {
        const { children, ...props } = this.props;

        this.populate();

        return new Node(Child, { ...props, ...this.result }, children);
      }
    };
  }
}

export default new DetonatorUntrue();
