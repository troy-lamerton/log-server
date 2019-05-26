import React from 'react';
import CommitsMenu from './components/BranchCommitMenu'
import './App.css';

const App: React.FC = () => {
    return (
        <div className="App">
            <CommitsMenu />
        </div>
    );
}
    
export default App;
    