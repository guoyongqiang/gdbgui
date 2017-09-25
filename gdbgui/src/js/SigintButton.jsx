import React from 'react'
import Actions from './Actions.js'
import {store} from './store.js'

class SigintButton extends React.Component {

    constructor() {
        super()
        this.state = {inferior_pid: store._store.inferior_pid}
        store.subscribe(this._store_change_callback.bind(this))
    }

    _store_change_callback(){
        this.setState({inferior_pid: store._store.inferior_pid})
    }

    static kill_pid(pid){
        $.ajax({
            url: "/sigint",
            cache: false,
            type: 'GET',
            data: {pid: pid},
            success: function(response){
                console.log(response)
                store.set('status', {text: response.message, error: false, warning: false})
                Actions.inferior_program_exited()
            },
            error: function(response){
                if (response.responseJSON && response.responseJSON.message){
                    store.set('status', {'text': _.escape(response.responseJSON.message), 'error': true})
                }else{
                    store.set('status', {'text': `${response.statusText} (${response.status} error)`, 'error': true})
                }
                console.error(response)
            },
            complete: function(){
            }
        })
    }

    render(){
        let int_button = ''
        if(this.state.inferior_pid){
            int_button = <button className='btn btn-default'
                        id='step_instruction_button'
                        type='button'
                        title={`Send SIGINT to pid ${this.state.inferior_pid}`}
                        onClick={()=>SigintButton.kill_pid(this.state.inferior_pid)}
                    >
                        SIGINT
                    </button>
        }

        return (
            <div className='btn-group btn-group-xs' role='group'>
                <button className='btn btn-default'
                    id='next_instruction_button'
                    type='button'
                    title="Next Instruction: Execute one machine instruction, stepping over function calls (keyboard shortcut: m)"
                >
                    NI
                </button>

                <button className='btn btn-default'
                    id='step_instruction_button'
                    type='button'
                    title="Step Instruction: Execute one machine instruction, stepping into function calls (keyboard shortcut: ,)"
                >
                    SI
                </button>

                {int_button}

            </div>
            )
    }
}

export default SigintButton
