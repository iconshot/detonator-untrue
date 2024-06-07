import { Comparer, Component, Node } from "untrue";

class RioterUntrue {
  constructor() {
    this.store = null;

    const self = this;

    this.Provider = class RioterProvider extends Component {
      constructor(props) {
        super(props);

        const { store, persistor = null } = this.props;

        self.store = store;

        // has persistor = loading

        const loading = persistor !== null;

        this.state = { loading, error: false };

        // init persistor on mount

        this.on("mount", async () => {
          if (!loading) {
            return;
          }

          try {
            await persistor.init();
          } catch (error) {
            this.updateState({ error: true });

            throw error;
          } finally {
            this.updateState({ loading: false });
          }
        });
      }

      render() {
        const { loadingNode = null, errorNode = null, children } = this.props;

        const { loading, error } = this.state;

        if (error) {
          return errorNode;
        }

        if (loading) {
          return loadingNode;
        }

        return children;
      }
    };
  }

  wrapSelector(Child, ...selectors) {
    const self = this;

    // consistent with Wrapper.wrapContext

    return class RioterSelector extends Component {
      constructor(props) {
        super(props);

        this.result = null;

        this.on("mount", this.handleMountStore);
        this.on("unmount", this.handleUnmountStore);

        this.compareTimeout = null;

        this.compareListener = () => {
          clearTimeout(this.compareTimeout);

          this.compareTimeout = setTimeout(() => this.compare());
        };
      }

      handleMountStore = () => {
        self.store.on("update", this.compareListener);
      };

      handleUnmountStore = () => {
        self.store.off("update", this.compareListener);
      };

      select() {
        const state = self.store.getState();

        return selectors.reduce((result, selector) => {
          if (result === null) {
            return null;
          }

          const newProps = { ...this.props, ...result };

          const newResult = selector(state, newProps);

          if (newResult === null) {
            return null;
          }

          return { ...result, ...newResult };
        }, {});
      }

      compare() {
        const result = this.select();

        const equal = Comparer.compare(result, this.result);

        if (equal) {
          return;
        }

        this.update();
      }

      render() {
        const { children, ...props } = this.props;

        this.result = this.select();

        if (this.result === null) {
          return null;
        }

        return new Node(Child, { ...props, ...this.result }, children);
      }
    };
  }
}

export default new RioterUntrue();
