import { Component } from '@angular/core';
import { NgForm } from '@angular/forms';
import { AppService } from '@app/service/app';

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.scss']
})
export class AppComponent {

  public showLogin: boolean = false;

  constructor(
    private app: AppService
  ) {

    this.app.onAuthChanged.subscribe(authenticated => {

      this.showLogin = ! authenticated;

    });

  }

  public login(form: NgForm): void {

    if ( form.invalid ) return;

    this.app.login(form.value.username, form.value.password)
    .catch(console.error);

  }

}
