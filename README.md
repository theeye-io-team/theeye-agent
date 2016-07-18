
# TheEye Agent.

## Unix How To

create configuration file in /etc/theeye . see /misc/etc/theeye for more information.

after creating the configuration file

$ ./run.sh

###optional arguments

to use a custom hostname. this will be used register the agent and host in the supervisor. hostname-customer combination **MUST** be unique

> THEEYE_CLIENT_HOSTNAME='custom_hostname


> SINGLE_CORE_WORKER='worker_name'

*'worker_name'* should be one of the following : 

* listener  
* psaux  
* dstat  



