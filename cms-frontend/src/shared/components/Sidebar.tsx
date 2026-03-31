import { Component } from "react";

interface SidebarPageState {
  initial: boolean;
}

class SidebarPage extends Component<object, SidebarPageState> {
  private _state: SidebarPageState = {
    initial: false,
  };

  private _setState = (key: keyof SidebarPageState, value: boolean) => {
    this.setState({ [key]: value } as Pick<
      SidebarPageState,
      keyof SidebarPageState
    >);
  };

  render() {
    return <div className=""></div>;
  }
}

export default SidebarPage;
