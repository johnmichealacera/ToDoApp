let inpTodo = document.getElementById('inpTodo');
let btnTodo = document.getElementById('btnTodo');
let listTodo = document.getElementById('listTodo');
let alertTask = document.getElementById('taskData');

//update display complete task on body click
document.body.addEventListener('click', function(){
	loadData();
});

//function display completed task
function loadData(){
let taskCount = listTodo.childElementCount;
let completed = listTodo.children;
let countComplete = 0;
for(let value of completed){
	let firstDiv = value.children;
	for(let crashedout of firstDiv){
		if(crashedout.children[1].style.textDecoration === 'line-through'){
			countComplete++;
		}
	}
}
alertTask.innerHTML = `Task Completed: ${countComplete}/${taskCount}`;
}

//add task when button click
btnTodo.addEventListener('click', function(){
	//checks if input is empty or not
	if(inpTodo.value.trim()){
		addTask(inpTodo.value.trim());
	}
	else{
		alert('Please enter a task');
		inpTodo.value = "";
		inpTodo.focus();
	}
});

//add task when user clicks the enter button on keyboard
inpTodo.addEventListener("keyup", function(event) {
  // Number 13 is the "Enter" key on the keyboard
  if (event.keyCode === 13) {
    // Trigger the button element with a click
    btnTodo.click();
  }
});

//checks for double click in the task list
listTodo.addEventListener('dblclick', function(ev){
	//checks if double click is on the label only and converts it to input text
	if(ev.target.nodeName === 'LABEL'){
		let secondDiv = ev.target.parentElement.children;
		//checks if task is already mark as completed
			for(let crashedout of secondDiv){
				if(crashedout.children[0].children[0].checked){
					alert('Task is already completed');
				}
			else{
				//enable update if task is not yet completed
				let task = ev.target.innerHTML
				let inpTaskUpdate = document.createElement('input');
				inpTaskUpdate.value = task;
				inpTaskUpdate.className = ev.target.className;
				ev.target.parentNode.replaceChild(inpTaskUpdate, ev.target);
				ev.target.focus();
				//updates the to do task
				inpTaskUpdate.addEventListener('focusout', function(ev){
					
					if(ev.target.value.trim()){
						let taskUpdated = ev.target.value.trim();
						let taskUpdatedLbl = document.createElement('label');
						taskUpdatedLbl.innerHTML = taskUpdated;
						taskUpdatedLbl.className = ev.target.className;
						ev.target.parentNode.replaceChild(taskUpdatedLbl, ev.target);
					}
					else{
						ev.target.focus();
						ev.target.placeholder = "Please update task";
						}
					});
				}
				}
			}
});

//checks if the list is click
listTodo.addEventListener('click', function(ev){
	//adds and removes line-through if user click checkbox
	if(ev.target.type === 'checkbox'){
		if(ev.target.checked){
			ev.target.parentNode.parentNode.nextElementSibling.style.textDecoration = 'line-through';
		}
		else{
			ev.target.parentNode.parentNode.nextElementSibling.style.textDecoration = 'none';
		}		
	}
	//deletes the task if the delete button is clicked
	else if(ev.target.type === 'submit'){
		ev.target.parentElement.parentElement.parentElement.remove();
		
	}
});

//add to do task function
function addTask(task){
	let taskName = document.createElement('li');
	let checkInp = document.createElement('div');
	checkInp.className = "input-group mb-3";
	let checkDesign1 = document.createElement('div');
	checkDesign1.className = "input-group-prepend";
	let checkDesign2 = document.createElement('div');
	checkDesign2.className = "input-group-text";
	let checkBox = document.createElement('input');
	checkBox.type = "checkbox";
	
	listTodo.appendChild(taskName);
	taskName.appendChild(checkInp);
	checkInp.appendChild(checkDesign1);
	checkDesign1.appendChild(checkDesign2);
	checkDesign2.appendChild(checkBox);
	
	let taskLabel = document.createElement('label');
	taskLabel.className = "form-control";
	let labelText = document.createTextNode(task);
	taskLabel.appendChild(labelText);
	checkInp.appendChild(taskLabel);
	
	let taskBtnDiv = document.createElement('div');
	taskBtnDiv.className = "input-group-append";
	let taskBtn = document.createElement('input');
	taskBtn.type = "submit";
	taskBtn.value = "Delete";
	taskBtn.className = "w-100 btn btn-danger";
	taskBtnDiv.appendChild(taskBtn);
	checkInp.appendChild(taskBtnDiv);
	
	//clears input text and sets focus
	inpTodo.value = "";
	inpTodo.focus();
	
}