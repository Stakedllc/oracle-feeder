package types

import (
	"fmt"
	"time"
)

// Primitive interface of terrafeeder Tasks
type Task interface {
	InitHandler()
	ShutdownHandler()
	RunHandler()
}

// Task Runner
type TaskRunner struct {
	Name string

	done   chan struct{}
	ticker *time.Ticker

	Task
}

func NewTaskRunner(name string, task Task, interval time.Duration) *TaskRunner {
	var ticker *time.Ticker

	if interval != 0 {
		ticker = time.NewTicker(interval)
	}

	return &TaskRunner{name, make(chan struct{}), ticker, task}
}

// starting point of task
func (runner *TaskRunner) Run() {

	runner.Task.InitHandler()
	fmt.Printf("%s is Ready\r\n", runner.Name)

	if runner.ticker != nil {
		fmt.Printf("%s Run as periodic mode", runner.Name)
		for {
			select {
			case <-runner.done:
				fmt.Printf("%s is shutting down\r\n", runner.Name)
				runner.Task.ShutdownHandler()
				return

			case <-runner.ticker.C:
				runner.Task.RunHandler()
			}
		}
	} else {
		fmt.Printf("%s Run as one-time mode", runner.Name)
		select {
		case <-runner.done:
			fmt.Printf("%s is shutting down\r\n", runner.Name)
			runner.Task.ShutdownHandler()
			return

		default:
			runner.Task.RunHandler()
		}
	}
}

// Stop task
func (runner *TaskRunner) Stop() {
	close(runner.done)
}

// Change running interval of task
func (runner *TaskRunner) SetInterval(interval time.Duration) {

	close(runner.done)

	if interval != 0 {
		runner.ticker = time.NewTicker(interval)
	} else {
		runner.ticker = nil
	}
	go runner.Run()
}