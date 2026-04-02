import { Component } from "react";
import { ThemeContext, type IThemeContext } from "./ThemeContext";

export function withTheme<P extends { theme?: IThemeContext }>(
  WrappedComponent: React.ComponentType<P>,
) {
  return class WithTheme extends Component<
    Omit<P, "theme"> & { forwardedRef?: React.Ref<unknown> }
  > {
    static displayName = `WithTheme(${WrappedComponent.displayName || WrappedComponent.name || "Component"})`;

    render() {
      const { forwardedRef, ...props } = this.props;

      return (
        <ThemeContext.Consumer>
          {(themeContext) => (
            <WrappedComponent
              {...(props as P)}
              theme={themeContext}
              ref={forwardedRef}
            />
          )}
        </ThemeContext.Consumer>
      );
    }
  };
}
