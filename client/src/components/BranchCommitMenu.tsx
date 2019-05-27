import * as React from 'react';
import * as superagent from 'superagent'
import prefix from 'superagent-prefix'
import { assign, map, keys } from 'lodash'
import cx from 'classnames'

let request = superagent;
request = require('superagent-use')(superagent);
(request as any).use(prefix('http://localhost:8090'));

export interface IBranchCommitMenuProps {
}

type State = {
  branches: { [branch: string]: string[] }
  branchNames: string[],
  activeBranch?: string,
  activeCommit?: string,
  players: { [player: string]: string[] }
}

export default class BranchCommitMenu extends React.Component<IBranchCommitMenuProps, State> {
  constructor(props: IBranchCommitMenuProps) {
    super(props)
    this.state = {
      branches: {},
      branchNames: [],
      players: {}
    }
  }

  public componentDidMount() {
    request.get('/logs').then(res => {
      const branches = res.body
      const branchNames = keys(branches)
      branchNames.sort()

      this.setState({
        branches,
        branchNames
      })
    })
  }

  public render() {
    return (
      <main>

        <div className="nameList branches">
          <h2>BRANCHES</h2>
          {map(this.state.branchNames, (branch: string) => (
            <div
              key={branch}
              className={cx('name', 'trunc', { activeItem: branch === this.state.activeBranch })} onClick={this.clickBranch}>
              {branch}
            </div>
          ))}
        </div>

        <div className="nameList commits">
          {map(this.state.branches, (commits: string[], branch: string) => (
            <div key={branch} className="commitsGroup" style={{display: branch === this.state.activeBranch ? 'initial' : 'none'}}>
            {commits.map(commit =>
              <div
                key={commit}
                className={cx('name', 'trunc', { activeItem: commit === this.state.activeCommit })}
                onClick={this.clickCommit}>
                {commit}
              </div>
            )}
            </div>
          ))}
        </div>

        <div>
          {this.state.activeCommit ? 
            map(this.state.players[this.state.activeCommit], name => <div className="name trunc">{name}</div>)
            : ''}
        </div>

      </main>
    );
  }

  private loadPlayerList(commit: string) {
    request.get(`/logs/${commit}`).then(res => {
      this.setState(state => ({
        players: assign(state.players, {[commit]: res.body})
      }))
    })
  }


  private clickBranch = (event: React.MouseEvent<HTMLDivElement>) => {
    const branch = event.currentTarget.innerText
    const commits = this.state.branches[branch]
    const activeCommit = commits.length === 1 ? commits[0] : this.state.activeCommit
    this.setState({
      activeBranch: branch,
      activeCommit,
    })
  }

  private clickCommit = (event: React.MouseEvent<HTMLDivElement>) => {
    const activeCommit = event.currentTarget.innerText
    this.setState({ activeCommit })
    this.loadPlayerList(activeCommit)
  }

  componentDidUpdate() {
    window.location.hash = `${this.state.activeBranch}+${this.state.activeCommit}`
    window.document.title = `Logs ${this.state.activeBranch || ''} ${this.state.activeCommit || ''}`
  }

}
  