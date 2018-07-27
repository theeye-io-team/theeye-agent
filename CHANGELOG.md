# CHANGELOG

# force build 1.

### 0.10.0-beta - 2017-03-13

> file monitor worker added    

> improve workers errors detection and reporting     

> adapt script monitor to support generic file lib    


### 0.9.4-beta - 2017-02-01

> added samples link in README     

> added script to compile using enclose    

> added theeye-cli    

> default client request configuration options set (proxy, tunnel, json, gzip, timeout)      

> change default script download location       

> added file monitoring support with a file worker      

> common file functions moved out of script worker to lib/file. also added extra features like mode, owner and group handling, and validations. also added error reporting.     

> improve code legibility , add constants, standards, etc       

> capture error on workers instantiation (try..catch)     

### 0.9.3-beta - 2016-12-08

> allow to pass options directly to request setup from the config file. default common options set in config/default.js 

> removed enclose from package.json

> update version of node-stat to lastest. this version includes an own fixed version of diskusage with fixed packages versions inside

### 0.9.2-beta - 2016-12-05

> added sample code, docs and examples for scripts creation      

> set network proxy using configuration file     

> remove unused code    

> improve configuration     

> child process are killed when take too much time to finish     

> set environment when no configuration is provided     

> improve code and correct references to work with enclose, allowing to compile source into binary

> change path how to include files from disk paths.     

> remove dinamic linking of files      

> workers are now defined using a mixing pattern     

> remove unused code      

> fixes scraper worker     

> escape arguments when include spaces (allow shell parameters expansion on parameters)    


### 0.9.1-beta - 2016-09-24

> include theeye client into source . no more npm dependency      

> call script worker when arrive a script job      

> validate scraper patter before use and break worker is error found        

> new version of ps-list package released           

> added default ps-node arguments         

### 0.9.0-beta - 2016-09-09

> merge windows branch into demo     

> added full support for windows operating systemas. systems stats and process , grep process support , run scripts 

### 0.8.0-beta - 2016-09-08

> rewrite compiled lib/script/index & lib/script/output as ES5 syntax and support       

> change scripts path within agent directory by default          

> installation script choose between node v0.12 or v4        

> added mocha and chai as dev-dependencies      

> returned script result is submited to the supervisor with no changes         

> added scraper extended capability and configuration    

> remove shellscaped       

> rewrite App singleton class. App does include the connection to the supervisor      

> Worker.spawn method create an instance but do not put the worker to run      

> Listener job processor also handle scraper tasks with a ScraperWorker          

> Scraper Request wraper with default options , only configure once       

> Scraper stream parser removed         

### 0.7.1-beta - 2016-08-22

> remove all ES6 code, for unsupported nodejs environments on servers     

> fix to v0.12 support     

### 0.7.0-beta - 2016-08-19

> improve and fix installation script      

> change to MIT license       

> improve scripts execution. add run as capability     

> escape shell command line scripts     

> point theeye-client to npm 0.9.0

### 0.6.5-beta - 2016-08-03

> update package theeye-client version , release and license

### 0.6.4-beta - 2016-07-29

> added CHANGELOG.md  

> fix theeye-client version reference to 0.8.2 in package. last required   

> remove annoying dump-debug calls.   



