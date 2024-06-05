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

            queueMicrotask(() => {
              throw error;
            });
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

      select() {
        const state = self.store.getState();

        try {
          return selectors.reduce((result, selector) => {
            const newProps = { ...this.props, ...result };

            const newResult = selector(state, newProps);

            return { ...result, ...newResult };
          }, {});
        } catch (error) {
          queueMicrotask(() => {
            throw error;
          });

          return null;
        }
      }

      populate() {
        const result = this.select();

        if (result === null) {
          return;
        }

        this.result = result;
      }

      compare() {
        const result = this.select();

        if (result === null) {
          return;
        }

        const updated = !Comparer.compareDeep(result, this.result);

        if (updated) {
          this.update();
        }
      }

      render() {
        const { children, ...props } = this.props;

        this.populate();

        return new Node(Child, { ...props, ...this.result }, children);
      }
    };
  }
}

export default new RioterUntrue();
