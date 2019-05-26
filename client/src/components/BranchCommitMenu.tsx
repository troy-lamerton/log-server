import * as React from 'react';
import * as request from 'superagent'

export interface IBranchCommitMenuProps {
}

export default class BranchCommitMenu extends React.Component<IBranchCommitMenuProps, any> {
  constructor(props: IBranchCommitMenuProps) {
    super(props)
    this.state = {}
  }

  public componentDidMount() {
    request.get('http://localhost:80/logs').then(res => {
      this.setState({body: res.body})
    })
  }

  public render() {
    return (
      <main>
        <aside>
          <div>Branches</div>
          
        </aside>
        <div>kk</div>
      </main>
    );
  }
}
  