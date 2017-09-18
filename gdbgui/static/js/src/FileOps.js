
import {store} from './store.js';
import GdbApi from './GdbApi.js';
import constants from './constants.js';

const FileOps = {
    init: function(){
        store.subscribe(FileOps._store_change_callback)
        document.getElementById('fetch_assembly_cur_line').onclick = FileOps.fetch_assembly_cur_line
        document.getElementById('refresh_cached_source_files').onclick = FileOps.refresh_cached_source_files
    },
    _store_change_callback: function(){
        const states = constants.source_code_states

        let fullname = store.get('fullname_to_render')
        , cached_source_file = FileOps.is_cached(fullname)
        , is_missing = FileOps.is_missing_file(fullname)
        , is_paused = store.get('inferior_program') !== 'paused'
        , paused_addr = store.get('current_assembly_address')

        // we have file cached
        // TODO test for constants.ASSM_AND_SOURCE_CACHED
        if(fullname && cached_source_file){
            // do nothing
            store.set('source_code_state', states.SOURCE_CACHED)

        }else if (fullname && !is_missing ){
            // we don't have file cached, try to get it
            store.set('source_code_state', states.FETCHING_SOURCE)
            FileOps.fetch_file(fullname)

        } else if (is_paused && paused_addr && store.get('disassembly_for_missing_file').some(obj => parseInt(obj.address, 16) === parseInt(paused_addr, 16))){
            store.set('source_code_state', states.ASSM_CACHED)

        } else if(is_paused && paused_addr){
            // get disassembly
            store.set('source_code_state', states.FETCHING_ASSM)
            FileOps.fetch_disassembly_for_missing_file(paused_addr)

        } else {
            store.set('source_code_state', states.NONE_AVAILABLE)

        }
    },
    get_source_file_obj_from_cache: function(fullname){
        let cached_files = store.get('cached_source_files')
        for(let sf of cached_files){
            if (sf.fullname === fullname){
                return sf
            }
        }
        return null
    },
    add_source_file_to_cache: function(fullname, source_code, assembly, last_modified_unix_sec, exists=true){
        let new_source_file = {'fullname': fullname,
                                'source_code': source_code,
                                'assembly': assembly,
                                'last_modified_unix_sec': last_modified_unix_sec,
                                'exists': exists,
                            }
        , cached_source_files = store.get('cached_source_files')
        cached_source_files.push(new_source_file)
        store.set('cached_source_files', cached_source_files)
    },
    get_cached_assembly_for_file: function(fullname){
        for(let file of store.get('cached_source_files')){
            if(file.fullname === fullname){
                return file.assembly
            }
        }
        return []
    },
    refresh_cached_source_files: function(){
        FileOps.clear_cached_source_files()
        // TODO fetch current file
    },
    clear_cached_source_files: function(){
        store.set('rendered_source_file_fullname', null)
        store.set('cached_source_files', [])
    },
    is_cached: function(fullname){
        return store.get('cached_source_files').some(f => f.fullname === fullname)
    },
    fetch_file: function(fullname){
        if(FileOps.is_missing_file(fullname)){
            // file doesn't exist and we already know about it
            // don't keep trying to fetch disassembly
            console.warn(`tried to fetch a file known to be missing ${fullname}`)
            return
        }

        if(!_.isString(fullname)){
            console.warn(`trying to fetch filename that is not a string`, fullname)
            FileOps.add_missing_file(fullname)
        }else if(!fullname.startsWith('/')){
            // this can happen when an executable doesn't have debug symbols.
            // don't try to fetch it because it will never exist.
            FileOps.add_missing_file(fullname)
            return
        }

        if(FileOps.is_file_being_fetched(fullname)){
            // nothing to do
            return
        }else{
            FileOps.add_file_being_fetched(fullname)
        }

        $.ajax({
            url: "/read_file",
            cache: false,
            type: 'GET',
            data: {path: fullname, highlight: store.get('highlight_source_code')},
            success: function(response){
                FileOps.add_source_file_to_cache(fullname, response.source_code, {}, response.last_modified_unix_sec)
            },
            error: function(response){
                if (response.responseJSON && response.responseJSON.message){
                    store.set('status', {'text': _.escape(response.responseJSON.message), 'error': true})
                }else{
                    store.set('status', {'text': `${response.statusText} (${response.status} error)`, 'error': true})
                }
                FileOps.file_no_longer_being_fetched(fullname)
                FileOps.add_missing_file(fullname)
            },
            complete: function(){
                FileOps.file_no_longer_being_fetched(fullname)
            }
        })
    },
    is_file_being_fetched: function(fullname){
        return store.get('files_being_fetched').indexOf(fullname) !== -1
    },
    is_missing_file: function(fullname){
        return store.get('missing_files').indexOf(fullname) !== -1
    },
    add_missing_file: function(fullname){
        let missing_files = store.get('missing_files')
        missing_files.push(fullname)
        store.set('missing_files', missing_files)
    },
    add_file_being_fetched: function(fullname){
        let files = store.get('files_being_fetched')
        if(files.indexOf(fullname) !== -1){
            console.warn(`${fullname} is already being fetched`)
        }
        files.push(fullname)
        store.set('files_being_fetched', files)
    },
    file_no_longer_being_fetched: function(fullname){
        let files = store.get('files_being_fetched')
        store.set('files_being_fetched', _.without(files, fullname))
    },
    /**
     * gdb changed its api for the data-disassemble command
     * see https://www.sourceware.org/gdb/onlinedocs/gdb/GDB_002fMI-Data-Manipulation.html
     * TODO not sure which version this change occured in. I know in 7.7 it needs the '3' option,
     * and in 7.11 it needs the '4' option. I should test the various version at some point.
     */
    get_dissasembly_format_num: function(gdb_version_array){
        if(gdb_version_array.length === 0){
            // assuming new version, but we shouldn't ever not know the version...
            return 4

        } else if (gdb_version_array[0] < 7 || (parseInt(gdb_version_array[0]) === 7 && gdb_version_array[1] <= 7)){
            // this option has been deprecated in newer versions, but is required in older ones
            return 3
        }else{
            return 4
        }
    },
    get_fetch_disassembly_command: function(fullname, start_line){
        let mi_response_format = FileOps.get_dissasembly_format_num(store.get('gdb_version_array'))
        if(_.isString(fullname) && fullname.startsWith('/')){
            if(store.get('interpreter') === 'gdb'){
                return `-data-disassemble -f ${fullname} -l ${start_line} -n 100 -- ${mi_response_format}`
            }else{
                console.log('TODOLLDB - get mi command to disassemble')
                return `disassemble --frame`
            }
        }else{
            console.warn('not fetching undefined file')
        }
    },
    /**
     * Fetch disassembly for current file/line.
     */
    fetch_assembly_cur_line: function(){
        let fullname = store.get('fullname_to_render')
        , line = parseInt(store.get('line_of_source_to_flash'))
        if(!line){
            line = 1
        }
        FileOps.fetch_disassembly(fullname, line)
    },
    fetch_disassembly: function(fullname, start_line){
        let cmd = FileOps.get_fetch_disassembly_command(fullname, start_line)
        if(cmd){
           GdbApi.run_gdb_command(cmd)
        }
    },
    fetch_disassembly_for_missing_file: function(hex_addr){
        // https://sourceware.org/gdb/onlinedocs/gdb/GDB_002fMI-Data-Manipulation.html
        if(window.isNaN(hex_addr)){
            return
        }

        let start = parseInt(hex_addr, 16)
        , end = start + 100
        GdbApi.run_gdb_command(constants.DISASSEMBLY_FOR_MISSING_FILE_STR + `-data-disassemble -s 0x${start.toString((16))} -e 0x${end.toString((16))} -- 0`)
    },
    /**
     * Save assembly and render source code if desired
     * @param mi_assembly: array of assembly instructions
     * @param mi_token (int): corresponds to either null (when src file is known and exists),
     *  constants.DISASSEMBLY_FOR_MISSING_FILE_INT when source file is undefined or does not exist on filesystem
     */
    save_new_assembly: function(mi_assembly, mi_token){
        if(!_.isArray(mi_assembly) || mi_assembly.length === 0){
            console.error('Attempted to save unexpected assembly', mi_assembly)
        }

        let fullname = mi_assembly[0].fullname
        if(mi_token === constants.DISASSEMBLY_FOR_MISSING_FILE_INT){
            store.set('disassembly_for_missing_file', mi_assembly)
            store.set('has_unrendered_assembly', true)
            return
        }

        // convert assembly to an object, with key corresponding to line numbers
        // and values corresponding to asm instructions for that line
        let assembly_to_save = {}
        for(let obj of mi_assembly){
            assembly_to_save[parseInt(obj.line)] = obj.line_asm_insn
        }

        let cached_source_files = store.get('cached_source_files')
        for (let cached_file of cached_source_files){
            if(cached_file.fullname === fullname){
                cached_file.assembly = $.extend(true, cached_file.assembly, assembly_to_save)

                let max_assm_line = Math.max(Object.keys(cached_file.assembly))

                if(max_assm_line > cached_file.source_code.length){
                    cached_file.source_code[max_assm_line] = ''
                    for(let i = 0; i < max_assm_line; i++){
                        if(!cached_file.source_code[i]){
                            cached_file.source_code[i] = ''
                        }
                    }
                }
                store.set('cached_source_files', cached_source_files)
                break
            }
        }
        store.set('has_unrendered_assembly', true)
    },
}
export default FileOps
