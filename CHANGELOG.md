# CHANGELOG

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



